// Last submitted HTMLFormElement that will cause a browser navigation.
let submittedForm: HTMLFormElement | null = null

function shouldResumeField(field: PersistableElement, filter: StorageFilter): boolean {
  return !!field.id && filter(field) && field.form !== submittedForm
}

function valueIsUnchanged(field: PersistableElement): boolean {
  if (field instanceof HTMLSelectElement) {
    return true
  } else if (isHTMLCheckableInputElement(field)) {
    return field.checked !== field.defaultChecked
  } else {
    return field.value !== field.defaultValue
  }
}

function isPersistableElement(node: Node | null): node is PersistableElement {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement
}

type PersistableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

type StorageFilter = (field: PersistableElement) => boolean

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

type HTMLCheckableInputElement = HTMLInputElement & {
  type: 'checkbox' | 'radio'
}

function isHTMLCheckableInputElement(
  field: HTMLInputElement | HTMLTextAreaElement
): field is HTMLCheckableInputElement {
  return field instanceof HTMLInputElement && /checkbox|radio/.test(field.type)
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
    if (isPersistableElement(el)) {
      resumables.push(el)
    }
  }

  let fields = resumables
    .filter(field => shouldResumeField(field, storageFilter))
    .map(field => {
      if (field instanceof HTMLSelectElement) {
        return [field.id, Array.from(field.selectedOptions).map(option => option.value)]
      } else {
        return [field.id, field.value]
      }
    })
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

  const changedFields: PersistableElement[] = []
  const storedFieldsNotFound: string[][] = []

  for (const [fieldId, value] of JSON.parse(fields)) {
    const resumeEvent = new CustomEvent('session:resume', {
      bubbles: true,
      cancelable: true,
      detail: {targetId: fieldId, targetValue: value}
    })

    if (document.dispatchEvent(resumeEvent)) {
      const field = document.getElementById(fieldId)
      if (isPersistableElement(field)) {
        if (field instanceof HTMLSelectElement) {
          for (const option of field.options) {
            option.selected = value.includes(option.value)
          }
          changedFields.push(field)
        } else if (isHTMLCheckableInputElement(field)) {
          field.checked = !field.defaultChecked
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
