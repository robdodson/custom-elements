/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/**
 * This shim allows elements written in, or compiled to, ES5 to work on native
 * implementations of Custom Elements v1. It sets new.target to the value of
 * this.constructor so that the native HTMLElement constructor can access the
 * current under-construction element's definition.
 *
 * Because `new.target` is a syntax error in VMs that don't support it, this
 * shim must only be loaded in browsers that do.
 */
(() => {
  'use strict';

  const NativeHTMLElement = HTMLElement;
  const nativeDefine = window.customElements.define;
  const nativeGet = window.customElements.get;

  /**
   * Map of user-provided constructors to tag names.
   *
   * @type {Map<Function, string>}
   */
  const tagnameByConstructor = new Map();

  /**
   * Map of tag anmes to user-provided constructors.
   *
   * @type {Map<string, Function>}
   */
  const constructorByTagname = new Map();


  // /**
  //  * Whether the constructors are being called by a browser process, ie parsing
  //  * or createElement.
  //  */
  // let browserConstruction = false;
  //
  // /**
  //  * Whether the constructors are being called by a user-space process, ie
  //  * calling an element constructor.
  //  */
  // let userConstruction = false;

  window.HTMLElement = function() {
    if (!HTMLElement.browserConstruction) {
      const tagname = tagnameByConstructor.get(this.constructor);
      const fakeClass = nativeGet.call(window.customElements, tagname);

      // Make sure that the fake constructor doesn't call back to this constructor
      HTMLElement.userConstruction = true;
      const instance = new (fakeClass)();
      return instance;
    }
    // Else do nothing. This will be reached by ES5-style classes doing
    // HTMLElement.call() during initialization
    HTMLElement.browserConstruction = false;
  };

  HTMLElement.prototype = Object.create(NativeHTMLElement.prototype);
  HTMLElement.prototype.constructor = HTMLElement;
  HTMLElement.nativeClass = NativeHTMLElement;


  /**
   * Whether the constructors are being called by a browser process, ie parsing
   * or createElement.
   */
  HTMLElement.browserConstruction = false;

  /**
   * Whether the constructors are being called by a user-space process, ie
   * calling an element constructor.
   */
  HTMLElement.userConstruction = false;

  window.customElements.define = (tagname, elementClass) => {

    const FakeElement = class extends NativeHTMLElement {
      constructor() {
        // Call the native HTMLElement constructor, this gives us the
        // under-construction instance as `this`:
        super();

        // The prototype will be wrong up because the browser used our fake
        // class, so fix it:
        Object.setPrototypeOf(this, elementClass.prototype);

        if (!HTMLElement.userConstruction) {
          // Make sure that user-defined constructor bottom's out to a do-nothing
          // HTMLElement() call
          HTMLElement.browserConstruction = true;
          // Call the user-defined constructor on our instance:
          elementClass.call(this);
        }
        HTMLElement.userConstruction = false;
      }
    }
    if ('observedAttributes' in elementClass) {
      FakeElement.observedAttributes = elementClass.observedAttributes;
    }
    const elementProto = Object.getPrototypeOf(elementClass);
    if ('connectedCallback' in elementProto) {
      FakeElement.prototype.connectedCallback = function() {
        elementProto.connectedCallback.call(this);
      }
    }
    if ('disconnectedCallback' in elementProto) {
      FakeElement.prototype.disconnectedCallback = function() {
        elementProto.disconnectedCallback.call(this);
      }
    }
    if ('attributeChangedCallback' in elementProto) {
      FakeElement.prototype.attributeChangedCallback = function() {
        elementProto.attributeChangedCallback.call(this);
      }
    }
    if ('adoptedCallback' in elementProto) {
      FakeElement.prototype.adoptedCallback = function() {
        elementProto.adoptedCallback.call(this);
      }
    }

    tagnameByConstructor.set(elementClass, tagname);
    constructorByTagname.set(tagname, elementClass);
    nativeDefine.call(window.customElements, tagname, FakeElement);
  };

  window.customElements.get = function(tagname) {
    return constructorByTagname.get(tagname);
  };

})();
