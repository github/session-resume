// Last submitted HTMLFormElement that will cause a browser navigation.
let submittedForm: HTMLFormElement | null = null

function shouldResumeField(field: HTMLInputElement | HTMLTextAreaElement, filter: StorageFilter): boolean {
  return (
    !!field.id &&
    (field.value !== field.defaultValue ||
      (field instanceof HTMLInputElement && field.checked !== field.defaultChecked)) &&
    field.form !== submittedForm
  )
}

function valueIsUnchanged(field: HTMLInputElement | HTMLTextAreaElement): boolean {
  return field.value !== field.defaultValue
}

type StorageFilter = (field: HTMLInputElement | HTMLTextAreaElement) => boolean

type PersistOptionsWithSelector = {
  scope?: ParentNode
  selector?: string
  fields?: never
}

type PersistOptionsWithFields = {
  fields?: NodeList | Node[]
  selector?: never
  scope?: never
}

type PersistOptions = (PersistOptionsWithSelector | PersistOptionsWithFields) & {
  keyPrefix?: string
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  storageFilter?: StorageFilter
}

// Write all ids and values of the selected fields on the page into sessionStorage.
export function persistResumableFields(id: string, options?: PersistOptions): void {
  const scope = options?.scope ?? document
  const selector = options?.selector ?? '.js-session-resumable'
  const elements = options?.fields ?? scope.querySelectorAll(selector)
  const keyPrefix = options?.keyPrefix ?? 'session-resume:'
  const storageFilter = options?.storageFilter ?? valueIsUnchanged

  let storage
  try {
    storage = options?.storage ?? sessionStorage
  } catch {
    // Ignore browser private mode error and return early
    return
  }

  const key = `${keyPrefix}${id}`
  const resumables = []

  for (const el of elements) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      resumables.push(el)
    }
  }

  let fields = resumables.filter(field => shouldResumeField(field, storageFilter)).map(field => [field.id, field.value])

  if (fields.length) {
    try {
      const previouslyStoredFieldsJson = storage.getItem(key)

      if (previouslyStoredFieldsJson !== null) {
        const previouslyStoredFields: string[][] = JSON.parse(previouslyStoredFieldsJson)
        const fieldsNotReplaced: string[][] = previouslyStoredFields.filter(function (oldField) {
          return !fields.some(field => field[0] === oldField[0])
        })
        fields = fields.concat(fieldsNotReplaced)
      }

      storage.setItem(key, JSON.stringify(fields))
    } catch {
      // Ignore browser private mode error.
    }
  }
}

type RestoreOptions = {keyPrefix?: string; storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>}

export function restoreResumableFields(id: string, options?: RestoreOptions): void {
  const keyPrefix = options?.keyPrefix ?? 'session-resume:'

  let storage
  try {
    storage = options?.storage ?? sessionStorage
  } catch {
    // Ignore browser private mode error and return early
    return
  }

  const key = `${keyPrefix}${id}`
  let fields

  try {
    fields = storage.getItem(key)
  } catch {
    // Ignore browser private mode error.
  }

  if (!fields) return

  const changedFields: Array<HTMLInputElement | HTMLTextAreaElement> = []
  const storedFieldsNotFound: string[][] = []

  for (const [fieldId, value] of JSON.parse(fields)) {
    const resumeEvent = new CustomEvent('session:resume', {
      bubbles: true,
      cancelable: true,
      detail: {targetId: fieldId, targetValue: value}
    })

    if (document.dispatchEvent(resumeEvent)) {
      const field = document.getElementById(fieldId)
      if (field && (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
        if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
          field.checked = true
          changedFields.push(field)
        } else if (field.value === field.defaultValue) {
          field.value = value
          changedFields.push(field)
        }
      } else {
        storedFieldsNotFound.push([fieldId, value])
      }
    }
  }

  // Some fields we want to restore are not always immediately present in the
  // DOM and may be added later. This holds onto the values until
  // they're needed.
  if (storedFieldsNotFound.length === 0) {
    try {
      storage.removeItem(key)
    } catch {
      // Ignore browser private mode error.
    }
  } else {
    storage.setItem(key, JSON.stringify(storedFieldsNotFound))
  }

  setTimeout(function () {
    for (const el of changedFields) {
      el.dispatchEvent(new CustomEvent('change', {bubbles: true, cancelable: true}))
    }
  }, 0)
}

export function setForm(event: Event): void {
  submittedForm = event.target as HTMLFormElement

  setTimeout(function () {
    if (event.defaultPrevented) {
      submittedForm = null
    }
  }, 0)
}
