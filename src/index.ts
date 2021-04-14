// Last submitted HTMLFormElement that will cause a browser navigation.
let submittedForm: HTMLFormElement | null = null

function shouldResumeField(field: HTMLInputElement | HTMLTextAreaElement): boolean {
  return !!field.id && field.value !== field.defaultValue && field.form !== submittedForm
}

type PersistOptions = {selector?: string; keyPrefix?: string}

// Write all ids and values of the selected fields on the page into sessionStorage.
export function persistResumableFields(id: string, options?: PersistOptions): void {
  const selector = options?.selector ?? '.js-session-resumable'
  const keyPrefix = options?.keyPrefix ?? 'session-resume:'
  const key = `${keyPrefix}${id}`
  const resumables = []

  for (const el of document.querySelectorAll(selector)) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      resumables.push(el)
    }
  }

  const fields = resumables.filter(field => shouldResumeField(field)).map(field => [field.id, field.value])

  if (fields.length) {
    try {
      sessionStorage.setItem(key, JSON.stringify(fields))
    } catch {
      // Ignore browser private mode error.
    }
  }
}

type RestoreOptions = {keyPrefix?: string}

export function restoreResumableFields(id: string, options?: RestoreOptions): void {
  const keyPrefix = options?.keyPrefix ?? 'session-resume:'
  const key = `${keyPrefix}${id}`
  let fields

  try {
    fields = sessionStorage.getItem(key)
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
        if (field.value === field.defaultValue) {
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
      sessionStorage.removeItem(key)
    } catch {
      // Ignore browser private mode error.
    }
  } else {
    sessionStorage.setItem(key, JSON.stringify(storedFieldsNotFound))
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
