# Session Resume

Annotate fields to be persisted on navigation away from the current page.
Fields will be automatically restored when the user revisits the page
again in their current browser session (excludes separate tabs).

Not designed for persisted crash recovery.

## Installation

```
$ npm install @github/session-resume
```

## Usage

### HTML

``` html
<form>
  <input id="new-comment" class="js-session-resumable"/>
</form>
```

### JS

```js
import {persistResumableFields, restoreResumableFields, setForm} from '@github/session-resume'

function getPageID() {
  return window.location.pathname
}

// Listen for all form submit events and to see if their default submission
// behavior is invoked.
window.addEventListener('submit', setForm, {capture: true})

// Resume field content on regular page loads.
window.addEventListener('pageshow', function() {
  restoreResumableFields(getPageID())
})

// Persist resumable fields when page is unloaded
window.addEventListener('pagehide', function() {
  persistResumableFields(getPageID())
})
```

#### `restoreResumableFields(id: string, options)`

The `restoreResumableFields(id: string, options)` function supports optional configurations:

* `storage:` - [`Storage`][] instance (defaults to [`window.sessionStorage`][])
* `keyPrefix:` - `string` prepended onto the storage key (defaults to `"session-resume"`)

[`Storage`]: https://developer.mozilla.org/en-US/docs/Web/API/Storage
[`window.sessionStorage`]: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage

#### `persistResumableFields(id: string, options)`

The `persistResumableFields(id: string, options)` function supports optional configurations:

* `storage:` - [`Storage`][] instance (defaults to [`window.sessionStorage`][])
* `storageFilter:` - `(field: HTMLInputElement | HTMLTextAreaElement) => boolean` predicate to determine whether or not to store a field (defaults to `(field) => field.value !== field.defaultValue`)
* `keyPrefix:` - `string` prepended onto the storage key (defaults to `"session-resume"`)
* `scope:` - `ParentNode` used to query field elements (defaults to `document`)
* `selector:` - `string` used to query field elements (defaults to `".js-session-resumable"`)
* `fields:` - `NodeList | Node[]` provide field elements as an alternative to querying (defaults to `options.scope.querySelectorAll(options.selector)`)

**Note:** When `fields` is specified, `scope` and `selectors` will be ignored.

[`Storage`]: https://developer.mozilla.org/en-US/docs/Web/API/Storage
[`window.sessionStorage`]: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
