/* @flow strict */

// Session Resume
//
// Annotate fields to be persisted on navigation away from the current page.
// Fields be automatically restored when the user revists the page again in
// their current browser session (excludes seperate tabs).
//
// Not design for persisted crash recovery.
//

// Last submitted HTMLFormElement that will cause a browser navigation
let submittedForm = null

function shouldResumeField(field: HTMLInputElement | HTMLTextAreaElement) {
  return field.id && field.value !== field.defaultValue && field.form !== submittedForm
}

type Options = {|selector: string|}

// Write all ids and values of the selected fields on the page into sessionStorage.
export function persistResumableFields(id: string, {selector = '.js-session-resumable'}: Options) {
  const key = `session-resume:${id}`
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
    } catch (error) {
      // Ignore browser private mode error.
    }
  }
}

export async function restoreResumableFields(id: string) {
  const key = `session-resume:${id}`
  let fields

  try {
    fields = sessionStorage.getItem(key)
  } catch (error) {
    // Ignore browser private mode error.
  }

  if (!fields) return

  try {
    sessionStorage.removeItem(key)
  } catch (error) {
    // Ignore browser private mode error.
  }

  const changedFields = []

  for (const [id, value] of JSON.parse(fields)) {
    const resumeEvent = new CustomEvent('session:resume', {
      bubbles: true,
      cancelable: true,
      detail: {targetId: id, targetValue: value}
    })

    if (document.dispatchEvent(resumeEvent)) {
      const field = document.getElementById(id)
      if (
        field &&
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
        field.value === field.defaultValue
      ) {
        field.value = value
        changedFields.push(field)
      }
    }
  }

  await Promise.resolve()

  for (const el of changedFields) {
    el.dispatchEvent(new CustomEvent('change', {bubbles: true, cancelable: true}))
  }
}

export async function setForm(event: Event) {
  submittedForm = event.target
  await Promise.resolve()
  if (event.defaultPrevented) {
    submittedForm = null
  }
}
