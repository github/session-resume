import {describe, it, beforeAll, expect} from 'vitest'
// eslint-disable-next-line import/extensions
import {persistResumableFields, restoreResumableFields} from '../src/index.ts'

describe('session-resume', function () {
  beforeAll(function () {
    // eslint-disable-next-line github/no-inner-html
    document.body.innerHTML = `
      <form>
        <input id="my-first-field" type="text" value="first-field-value" class="js-session-resumable" />
        <input id="my-second-field" type="text" value="second-field-value" class="js-session-resumable" />
        <input id="my-first-checkbox" type="checkbox" value="first-checkbox-value" class="js-session-resumable" />
        <input id="my-second-checkbox" type="checkbox" value="second-checkbox-value" class="js-session-resumable" />
        <input id="my-checked-checkbox" type="checkbox" value="checked-checkbox-value" class="js-session-resumable" checked />
        <select id="my-single-select-field" class="js-session-resumable">
          <option value="first">first</option>
          <option value="second">second</option>
        </select>
        <select id="my-multiple-select-field" class="js-session-resumable" multiple>
          <option value="first">first</option>
          <option value="second">second</option>
        </select>
      </form>
    `
    window.addEventListener('submit', sessionStorage.setForm, {capture: true})
  })

  describe('restoreResumableFields', function () {
    it('restores fields values from session storage by default', function () {
      sessionStorage.setItem(
        'session-resume:test-persist',
        JSON.stringify([
          ['my-first-field', 'test2'],
          ['my-first-checkbox', 'first-checkbox-value'],
          ['my-checked-checkbox', 'checked-checkbox-value'],
          ['my-single-select-field', ['second']],
          ['my-multiple-select-field', ['first', 'second']]
        ])
      )
      restoreResumableFields('test-persist')

      expect(document.querySelector('#my-first-field').value).toBe('test2')
      expect(document.querySelector('#my-second-field').value).toBe('second-field-value')
      expect(document.querySelector('#my-first-checkbox').checked).toBe(true)
      expect(document.querySelector('#my-second-checkbox').checked).toBe(false)
      expect(document.querySelector('#my-checked-checkbox').checked).toBe(false)
      expect(document.querySelector('#my-single-select-field').value).toBe('second')
      expect(document.querySelector('#my-multiple-select-field option[value=first]').selected).toBe(true)
      expect(document.querySelector('#my-multiple-select-field option[value=second]').selected).toBe(true)
    })

    it('uses a Storage object when provided as an option', function () {
      const fakeStorageBackend = {}
      const fakeStorage = {
        setItem(key, value) {
          fakeStorageBackend[key] = JSON.stringify(value)
        },
        getItem(key) {
          return JSON.parse(fakeStorageBackend[key] || null)
        }
      }

      fakeStorage.setItem(
        'session-resume:test-persist',
        JSON.stringify([
          ['my-first-field', 'test2'],
          ['my-single-select-field', ['second']],
          ['my-multiple-select-field', ['first', 'second']]
        ])
      )
      restoreResumableFields('test-persist', {storage: fakeStorage})

      expect(document.querySelector('#my-first-field').value).toBe('test2')
      expect(document.querySelector('#my-second-field').value).toBe('second-field-value')
      expect(document.querySelector('#my-single-select-field').value).toBe('second')
      expect(document.querySelector('#my-multiple-select-field option[value=first]').selected).toBe(true)
      expect(document.querySelector('#my-multiple-select-field option[value=second]').selected).toBe(true)
    })

    it('leaves unrestored values in session storage', function () {
      sessionStorage.setItem(
        'session-resume:test-persist',
        JSON.stringify([
          ['my-first-field', 'test2'],
          ['non-existant-field', 'test3']
        ])
      )
      document.querySelector('#my-first-field').value = 'first-field-value'
      document.querySelector('#my-second-field').value = 'second-field-value'

      restoreResumableFields('test-persist')

      expect(document.querySelector('#my-first-field').value).toBe('test2')
      expect(document.querySelector('#my-second-field').value).toBe('second-field-value')

      // Some fields we want to restore are not always present in the DOM
      // and may be added later. We hold onto the values until they're needed.
      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([['non-existant-field', 'test3']])
      )
    })

    it('removes the sessionStore key when all the fields were found', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')

      // Some fields we want to restore are not always present in the DOM
      // and may be added later. We hold onto the values until they're needed.
      expect(sessionStorage.getItem('session-resume:test-persist')).toBe(null)
    })

    it('fires off session:resume events for changed fields', function () {
      const fieldsRestored = {}
      document.addEventListener('session:resume', function (event) {
        fieldsRestored[event.detail.targetId] = event.detail.targetValue
      })

      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')

      expect(fieldsRestored).toEqual({'my-first-field': 'test2'})
    })

    it('fires off change for changed input[type=text] fields', function () {
      return new Promise(resolve => {
        for (const input of document.querySelectorAll('input[type=text]')) {
          input.addEventListener('change', function (event) {
            expect(event.target.id).toBe('my-first-field')
            resolve()
          })
        }

        sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
        restoreResumableFields('test-persist')
      })
    })

    it('fires off change for changed input[type=checkbox] fields', function () {
      return new Promise(resolve => {
        for (const input of document.querySelectorAll('input[type=checkbox]')) {
          input.addEventListener('change', function (event) {
            expect(event.target.id).toBe('my-first-checkbox')
            resolve()
          })
        }

        sessionStorage.setItem(
          'session-resume:test-persist',
          JSON.stringify([['my-first-checkbox', 'first-checkbox-value']])
        )
        restoreResumableFields('test-persist')
      })
    })
  })

  describe('persistResumableFields', function () {
    it('persist fields values to session storage by default', function () {
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      document.querySelector('#my-single-select-field').value = 'first'
      document.querySelector('#my-multiple-select-field option[value=first]').selected = true
      document.querySelector('#my-multiple-select-field option[value=second]').selected = true
      persistResumableFields('test-persist')

      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([
          ['my-first-field', 'test1'],
          ['my-second-field', 'test2'],
          ['my-single-select-field', ['first']],
          ['my-multiple-select-field', ['first', 'second']]
        ])
      )
    })

    it('uses a Storage object when provided as an option', function () {
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      document.querySelector('#my-single-select-field').value = 'second'
      document.querySelector('#my-multiple-select-field option[value=first]').selected = true
      document.querySelector('#my-multiple-select-field option[value=second]').selected = true

      const fakeStorageBackend = {}
      const fakeStorage = {
        setItem(key, value) {
          fakeStorageBackend[key] = JSON.stringify(value)
        },
        getItem(key) {
          return JSON.parse(fakeStorageBackend[key] || null)
        }
      }

      persistResumableFields('test-persist', {storage: fakeStorage})

      expect(JSON.parse(fakeStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([
          ['my-first-field', 'test1'],
          ['my-second-field', 'test2'],
          ['my-single-select-field', ['second']],
          ['my-multiple-select-field', ['first', 'second']]
        ])
      )
    })

    it('holds onto existing values in the store', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['non-existant-field', 'test3']]))
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      document.querySelector('#my-single-select-field').value = 'second'
      document.querySelector('#my-multiple-select-field option[value=first]').selected = true
      document.querySelector('#my-multiple-select-field option[value=second]').selected = true

      persistResumableFields('test-persist')

      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([
          ['my-first-field', 'test1'],
          ['my-second-field', 'test2'],
          ['my-single-select-field', ['second']],
          ['my-multiple-select-field', ['first', 'second']],
          ['non-existant-field', 'test3']
        ])
      )
    })

    it('replaces old values with the latest field values', function () {
      sessionStorage.setItem(
        'session-resume:test-persist',
        JSON.stringify([
          ['my-first-field', 'old data'],
          ['my-second-field', 'old data'],
          ['my-single-select-field', 'first'],
          ['my-multiple-select-field', ['first', 'second']]
        ])
      )
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      document.querySelector('#my-single-select-field').value = 'second'
      document.querySelector('#my-multiple-select-field option[value=first]').selected = false
      document.querySelector('#my-multiple-select-field option[value=second]').selected = true

      persistResumableFields('test-persist')

      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([
          ['my-first-field', 'test1'],
          ['my-second-field', 'test2'],
          ['my-single-select-field', ['second']],
          ['my-multiple-select-field', ['second']]
        ])
      )
    })

    it('scopes fields based on the selector: option', function () {
      document.getElementById('my-first-field').value = 'test1'
      document.getElementById('my-second-field').value = 'test2'

      sessionStorage.clear()
      persistResumableFields('test-persist', {selector: '#my-first-field'})

      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([['my-first-field', 'test1']])
      )
    })

    it('scopes fields based on the scope: option', function () {
      // eslint-disable-next-line github/no-inner-html
      document.body.innerHTML = `
        <form>
          <input id="my-first-field" value="first-field-value" class="js-session-resumable" />
          <input id="my-second-field" value="second-field-value" class="js-session-resumable" />
        </form>
        <input id="my-third-field" value="second-third-value" class="js-session-resumable" />
      `
      document.getElementById('my-first-field').value = 'test1'
      document.getElementById('my-second-field').value = 'test2'
      document.getElementById('my-third-field').value = 'test3'

      sessionStorage.clear()
      persistResumableFields('test-persist', {scope: document.querySelector('form')})

      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([
          ['my-first-field', 'test1'],
          ['my-second-field', 'test2']
        ])
      )
    })

    it('scopes fields based on the fields: option', function () {
      document.getElementById('my-first-field').value = 'test1'
      document.getElementById('my-second-field').value = 'test2'

      sessionStorage.clear()
      persistResumableFields('test-persist', {fields: document.querySelectorAll('#my-second-field')})

      expect(JSON.parse(sessionStorage.getItem('session-resume:test-persist'))).toEqual(
        expect.arrayContaining([['my-second-field', 'test2']])
      )
    })
  })
})
