import * as Y from 'yjs';

// Actions are the collaboration actions
export const Actions = Object.freeze({
  ENTER_NOTE: 'enterNote',
  NOTE_ENTERED: 'noteEntered',
  USER_ENTERED: 'userEntered',
  USER_LEFT: 'userLeft',
  CURSOR_UPDATED: 'cursorUpdated',
  CONTENT_UPDATED: 'contentUpdated',
  NOT_AUTHENTICATED: 'noteAuthenticated',
});

// Colors are the possible colors that a room (note) can assign
// to cursors, if there are more users than this the index should
// reset
export const Colors = Object.freeze([
  '#3cb44b', '#e6194b', '#ffe119', '#4363d8',
  '#f58231', '#911eb4', '#46f0f0', '#f032e6',
  '#bcf60c', '#fabebe', '#008080', '#e6beff',
  '#9a6324', '#fffac8', '#800000', '#aaffc3',
  '#808000', '#ffd8b1', '#000075', '#808080',
  '#ffffff', '#000000',
]);

/**
 * 
 * @param {string} str 
 */
export function stringToArray(str) {
  const ret = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    ret[i] = str.charCodeAt(i);
  }
  return ret
}

/**
 * 
 * @param {Uint8Array} array
 */
export function arrayToString(array) {
  let str = "";
  for (let i = 0; i < array.length; i++) {
    str += String.fromCharCode(parseInt(array[i]));
  }
  return str;
}

export function encodeDoc(doc) {
  return arrayToString(Y.encodeStateAsUpdate(doc));
}

/**
 * 
 * @param {string} str 
 */
export function decodeDoc(str) {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, stringToArray(str));
  return doc;
}
