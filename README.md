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

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
