import {persistResumableFields, restoreResumableFields} from '../dist/index.js'

describe('session-resume', function () {
  before(function () {
    document.body.innerHTML = `
      <form>
        <input id="my-first-field" value="first-field-value" class="js-session-resumable" />
        <input id="my-second-field" value="second-field-value" class="js-session-resumable" />
      </form>
    `
    window.addEventListener('submit', sessionStorage.setForm, {capture: true})
  })

  describe('restoreResumableFields', function () {
    it('restores fields values from session storage', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')

      assert.equal(document.querySelector('#my-first-field').value, 'test2')
      assert.equal(document.querySelector('#my-second-field').value, 'second-field-value')
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
      assert.deepEqual(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
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

    it('fires off change for changed fields', function (done) {
      for (const input of document.querySelectorAll('input')) {
        input.addEventListener('change', function (event) {
          done(assert.equal(event.target.id, 'my-first-field'))
        })
      }

      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      restoreResumableFields('test-persist')
    })
  })

  describe('persistResumableFields', function () {
    it('persist fields values to session storage', function () {
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      persistResumableFields('test-persist')

      assert.deepEqual(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2']
      ])
    })

    it('holds onto existing values in the store', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['non-existant-field', 'test3']]))
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'

      persistResumableFields('test-persist')

      assert.deepEqual(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2'],
        ['non-existant-field', 'test3']
      ])
    })

    it('replaces old values with the latest field values', function () {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'old data']]))
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'

      persistResumableFields('test-persist')

      assert.deepEqual(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2']
      ])
    })
  })
})
