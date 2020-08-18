export class ToyVue {
  constructor(config) {
    this.template = document.querySelector(config.el);
    this.data = reactive(config.data);
  
    for (const name in config.methods) {
      this[name] = () => {
        config.methods[name].apply(this.data);
      }
    }
    this.traversal(this.template);
  }

  traversal(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim().match(/^{{([\s\S]+)}}$/)) {
        let name = RegExp.$1.trim();
        effect(() => node.textContent = this.data[name]);
      }
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      let attributes = node.attributes;
      for (const attribute of attributes) {
        if (attribute.name === 'v-model') {
          const name = attribute.value;
          effect(() => node.value = this.data[name]);
          node.addEventListener('input', () => this.data[name] = node.value);
        }
        if (attribute.name.match(/^v-bind:([\s\S]+)$/)) {
          const attrname = RegExp.$1;
          const value = attribute.value;
          effect(() => node.setAttribute(attrname, this.data[value]));
        }
        if (attribute.name.match(/^v-on:([\s\S]+)$/)) {
          let eventname = RegExp.$1;
          let fnname = attribute.value;
          effect(() => node.addEventListener(eventname, this[fnname]));
        }
      }
    }
    if (node.childNodes && node.childNodes.length) {
      for (let child of node.childNodes) {
        this.traversal(child);
      }
    }
  }
}

let effects = new Map();

let currentEffect = null;

function effect(fn) {
  currentEffect = fn;
  fn();
  currentEffect = null;
}

function reactive(object) {
  let observed = new Proxy(object , {
    get(object, property) {
      if (currentEffect) {
        if (!effects.has(object))
          effects.set(object, new Map);
        if (!effects.get(object).has(property))
          effects.get(object).set(property, new Array);

        effects.get(object).get(property).push(currentEffect)
      }
      return object[property];
    },
    set(object, property, value) {
      object[property] = value;
      if (effects.has(object) && effects.get(object).has(property)) {
        for (let effect of effects.get(object).get(property)) {
          effect();
        }
      }
      return true;
    }
  })
  return observed;
}
