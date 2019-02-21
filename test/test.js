describe('session-resume', function() {
  before(function() {
    document.body.innerHTML = `
      <form>
        <input id="my-first-field" value="first-field-value" class="js-session-resumable" />
        <input id="my-second-field" value="second-field-value" class="js-session-resumable" />
      </form>
    `
    window.addEventListener('submit', sessionStorage.setForm, {capture: true})
  })

  describe('restoreResumableFields', function() {
    it('restores fields values from session storage', function() {
      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      sessionResume.restoreResumableFields('test-persist')

      assert.equal(document.querySelector('#my-first-field').value, 'test2')
      assert.equal(document.querySelector('#my-second-field').value, 'second-field-value')
    })

    it('fires off session:resume events for changed fields', function() {
      const fieldsRestored = {}
      document.addEventListener('session:resume', function(event) {
        fieldsRestored[event.detail.targetId] = event.detail.targetValue
      })

      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      sessionResume.restoreResumableFields('test-persist')

      assert.deepEqual(fieldsRestored, {'my-first-field': 'test2'})
    })

    it('fires off change for changed fields', function(done) {
      const changedFieldsIds = []
      for (const input of document.querySelectorAll('input')) {
        input.addEventListener('change', function(event) {
          done(assert.equal(event.target.id, 'my-first-field'))
        })
      }

      sessionStorage.setItem('session-resume:test-persist', JSON.stringify([['my-first-field', 'test2']]))
      sessionResume.restoreResumableFields('test-persist')
    })
  })

  describe('persistResumableFields', function() {
    it('persist fields values to session storage', function() {
      document.querySelector('#my-first-field').value = 'test1'
      document.querySelector('#my-second-field').value = 'test2'
      sessionResume.persistResumableFields('test-persist')

      assert.deepEqual(JSON.parse(sessionStorage.getItem('session-resume:test-persist')), [
        ['my-first-field', 'test1'],
        ['my-second-field', 'test2']
      ])
    })
  })
})
