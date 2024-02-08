// eslint-disable-next-line import/extensions
import {persistResumableFields, restoreResumableFields} from '../dist/index.js'

describe('session-resume', function () {
  before(function () {
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

      assert.equal(document.querySelector('#my-first-field').value, 'test2')
      assert.equal(document.querySelector('#my-second-field').value, 'second-field-value')
      assert.equal(document.querySelector('#my-first-checkbox').checked, true)
      assert.equal(document.querySelector('#my-second-checkbox').checked, false)
      assert.equal(document.querySelector('#my-checked-checkbox').checked, false)
      assert.equal(document.querySelector('#my-single-select-field').value, 'second')
      assert.equal(document.querySelector('#my-multiple-select-field option[value=first]').selected, true)
      assert.equal(document.querySelector('#my-multiple-select-field option[value=second]').selected, true)
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

      assert.equal(document.querySelector('#my-first-field').value, 'test2')
      assert.equal(document.querySelector('#my-second-field').value, 'second-field-value')
      assert.equal(document.querySelector('#my-single-select-field').value, 'second')
      assert.equal(document.querySelector('#my-multiple-select-field option[value=first]').selected, true)
      assert.equal(document.querySelector('#my-multiple-select-field option[value=second]').selected, true)
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

      assert.equal(document.querySelector('#my-first-field').value, 'test2')
      assert.equal(document.querySelector('#my-second-field').value, 'second-field-value')

      // Some fields we want to restore are not always present in the DOM
      // and may be added later. We hold onto the values until they're needed.
      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['non-existant-field', 'test3']
      ])
    })

    it('removes the sessionStore key when all the fields were found', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')

      // Some fields we want to restore are not always present in the DOM
      // and may be added later. We hold onto the values until they're needed.
      assert.equal(sessionStorage.getItem('session-resume:test-persist'), null)
    })

    it('fires off session:resume events for changed fields', function () {
      const fieldsRestored = {}
      document.addEventListener('session:resume', function (event) {
        fieldsRestored[event.detail.targetId] = event.detail.targetValue
      })

      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')

      assert.deepEqual(fieldsRestored, {'my-first-field': 'test2'})
    })

    it('fires off change for changed input[type=text] fields', function (done) {
      for (const input of document.querySelectorAll('input[type=text]')) {
        input.addEventListener('change', function (event) {
          done(assert.equal(event.target.id, 'my-first-field'))
        })
      }

      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')
    })

    it('fires off change for changed input[type=checkbox] fields', function (done) {
      for (const input of document.querySelectorAll('input[type=checkbox]')) {
        input.addEventListener('change', function (event) {
          done(assert.equal(event.target.id, 'my-first-checkbox'))
        })
      }

      sessionStorage.setItem(
        'session-resume:test-persist',
        JSON.stringify([['my-first-checkbox', 'first-checkbox-value']])
      )
      restoreResumableFields('test-persist')
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

      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2'],
        ['my-single-select-field', ['first']],
        ['my-multiple-select-field', ['first', 'second']]
      ])
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

      assert.includeDeepMembers(JSON.parse(fakeStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2'],
        ['my-single-select-field', ['second']],
        ['my-multiple-select-field', ['first', 'second']]
      ])
    })

    it('holds onto existing values in the store', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['non-existant-field', 'test3']]))
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      document.querySelector('#my-single-select-field').value = 'second'
      document.querySelector('#my-multiple-select-field option[value=first]').selected = true
      document.querySelector('#my-multiple-select-field option[value=second]').selected = true

      persistResumableFields('test-persist')

      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2'],
        ['my-single-select-field', ['second']],
        ['my-multiple-select-field', ['first', 'second']],
        ['non-existant-field', 'test3']
      ])
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

      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2'],
        ['my-single-select-field', ['second']],
        ['my-multiple-select-field', ['second']]
      ])
    })

    it('scopes fields based on the selector: option', function () {
      document.getElementById('my-first-field').value = 'test1'
      document.getElementById('my-second-field').value = 'test2'

      sessionStorage.clear()
      persistResumableFields('test-persist', {selector: '#my-first-field'})

      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1']
      ])
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

      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2']
      ])
    })

    it('scopes fields based on the fields: option', function () {
      document.getElementById('my-first-field').value = 'test1'
      document.getElementById('my-second-field').value = 'test2'

      sessionStorage.clear()
      persistResumableFields('test-persist', {fields: document.querySelectorAll('#my-second-field')})

      assert.includeDeepMembers(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-second-field', 'test2']
      ])
    })
  })
})
