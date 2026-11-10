"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports2) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq2 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar2(node) || isCollection(node)) && !!node.anchor;
    exports2.ALIAS = ALIAS;
    exports2.DOC = DOC;
    exports2.MAP = MAP;
    exports2.NODE_TYPE = NODE_TYPE;
    exports2.PAIR = PAIR;
    exports2.SCALAR = SCALAR;
    exports2.SEQ = SEQ;
    exports2.hasAnchor = hasAnchor;
    exports2.isAlias = isAlias2;
    exports2.isCollection = isCollection;
    exports2.isDocument = isDocument;
    exports2.isMap = isMap2;
    exports2.isNode = isNode;
    exports2.isPair = isPair;
    exports2.isScalar = isScalar2;
    exports2.isSeq = isSeq2;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path19) {
      const ctrl = callVisitor(key, node, visitor, path19);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path19, ctrl);
        return visit_(key, ctrl, visitor, path19);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path19 = Object.freeze(path19.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci2 = visit_(i, node.items[i], visitor, path19);
            if (typeof ci2 === "number")
              i = ci2 - 1;
            else if (ci2 === BREAK)
              return BREAK;
            else if (ci2 === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path19 = Object.freeze(path19.concat(node));
          const ck = visit_("key", node.key, visitor, path19);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path19);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path19) {
      const ctrl = await callVisitor(key, node, visitor, path19);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path19, ctrl);
        return visitAsync_(key, ctrl, visitor, path19);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path19 = Object.freeze(path19.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci2 = await visitAsync_(i, node.items[i], visitor, path19);
            if (typeof ci2 === "number")
              i = ci2 - 1;
            else if (ci2 === BREAK)
              return BREAK;
            else if (ci2 === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path19 = Object.freeze(path19.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path19);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path19);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path19) {
      if (typeof visitor === "function")
        return visitor(key, node, path19);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path19);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path19);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path19);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path19);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path19);
      return void 0;
    }
    function replaceNode(key, path19, node) {
      const parent = path19[path19.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports2.visit = visit;
    exports2.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports2.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports2.anchorIsValid = anchorIsValid;
    exports2.anchorNames = anchorNames;
    exports2.createNodeAnchors = createNodeAnchors;
    exports2.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports2) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports2.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports2.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports2) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type2) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type2 });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports2.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports2.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports2.Scalar = Scalar;
    exports2.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports2.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path19, value) {
      let v = value;
      for (let i = path19.length - 1; i >= 0; --i) {
        const k = path19[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path19) => path19 == null || typeof path19 === "object" && !!path19[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type2, schema) {
        super(type2);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path19, value) {
        if (isEmptyPath(path19))
          this.add(value);
        else {
          const [key, ...rest] = path19;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path19) {
        const [key, ...rest] = path19;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path19, keepScalar) {
        const [key, ...rest] = path19;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path19) {
        const [key, ...rest] = path19;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path19, value) {
        const [key, ...rest] = path19;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports2.Collection = Collection;
    exports2.collectionFromPath = collectionFromPath;
    exports2.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports2) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports2.indentComment = indentComment;
    exports2.lineComment = lineComment;
    exports2.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports2) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text2, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text2;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text2.length <= endStep)
        return text2;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text2, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text2[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text2[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text2, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text2[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text2[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text2;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text2;
      if (onFold)
        onFold();
      let res = text2.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text2.length;
        if (fold === 0)
          res = `
${indent}${text2.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text2[fold]}\\`;
          res += `
${indent}${text2.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text2, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text2[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text2[++i];
        } else {
          do {
            ch = text2[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text2[start];
        }
      }
      return end;
    }
    exports2.FOLD_BLOCK = FOLD_BLOCK;
    exports2.FOLD_FLOW = FOLD_FLOW;
    exports2.FOLD_QUOTED = FOLD_QUOTED;
    exports2.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote: singleQuote2 } = ctx.options;
      let qs;
      if (singleQuote2 === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote2 ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type: type2, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type2 === Scalar.Scalar.BLOCK_FOLDED ? false : type2 === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type2 !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type: type2, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type2 !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type: type2 } = item;
      if (type2 !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type2 = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type2);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports2.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify2(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports2.createStringifyContext = createStringifyContext;
    exports2.stringify = stringify2;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify2.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify2.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports2.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports2) {
    "use strict";
    var node_process = require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports2.debug = debug;
    exports2.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports2.addMergeToJSMap = addMergeToJSMap;
    exports2.isMergeKey = isMergeKey;
    exports2.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports2) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify2 = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify2.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports2.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports2.Pair = Pair;
    exports2.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify3 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify3(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify2.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify2.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports2.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports2) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports2.YAMLMap = YAMLMap;
    exports2.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports2.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports2.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports2.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports2) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports2.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports2.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports2.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports2) {
    "use strict";
    function stringifyNumber({ format: format2, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num2 = typeof value === "number" ? value : Number(value);
      if (!isFinite(num2))
        return isNaN(num2) ? ".nan" : num2 < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format2 && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports2.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num2 = Number(node.value);
        return isFinite(num2) ? num2.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool2 = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool2.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports2.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports2.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports2) {
    "use strict";
    var node_buffer = require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type: type2, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type2 ?? (type2 = Scalar.Scalar.BLOCK_LITERAL);
        if (type2 !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type2 === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type: type2, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports2.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs3 = new YAMLSeq.YAMLSeq(schema);
      pairs3.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs3.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs3;
    }
    var pairs2 = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports2.createPairs = createPairs;
    exports2.pairs = pairs2;
    exports2.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs2 = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs2.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs2.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports2.YAMLOMap = YAMLOMap;
    exports2.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports2.falseTag = falseTag;
    exports2.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num2 = Number(node.value);
        return isFinite(num2) ? num2.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intBin = intBin;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports2.YAMLSet = YAMLSet;
    exports2.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num2 = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num2(60) + num2(p), num2(0));
      return sign === "-" ? num2(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num2 = (n) => n;
      if (typeof value === "bigint")
        num2 = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num2(-1);
      }
      const _60 = num2(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports2.floatTime = floatTime;
    exports2.intTime = intTime;
    exports2.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool2 = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs2 = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool2.trueTag,
      bool2.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs2.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports2.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool2 = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs2 = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool2.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs2.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs2.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports2.coreKnownTags = coreKnownTags;
    exports2.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports2.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify2.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify2.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify2.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports2.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path19, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path19, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path19) {
        if (Collection.isEmptyPath(path19)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path19) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path19, keepScalar) {
        if (Collection.isEmptyPath(path19))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path19, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path19) {
        if (Collection.isEmptyPath(path19))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path19) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path19, value) {
        if (Collection.isEmptyPath(path19)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path19), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path19, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports2.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports2) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci2 = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci2 >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci2 - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci2 -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci2))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci2));
        }
        const pointer = " ".repeat(ci2) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports2.YAMLError = YAMLError;
    exports2.YAMLParseError = YAMLParseError;
    exports2.YAMLWarning = YAMLWarning;
    exports2.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports2) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports2.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports2) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports2.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports2) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports2.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports2.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports2) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep: sep6, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep6?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep6) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep6 ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep6, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports2.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports2) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports2.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports2) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep6 = "";
        for (const token of end) {
          const { source, type: type2 } = token;
          switch (type2) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep6 + cb;
              sep6 = "";
              break;
            }
            case "newline":
              if (comment)
                sep6 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type2} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports2.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap2 = fc.start.source === "{";
      const fcName = isMap2 ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap2 ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep: sep6, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep6?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep6 && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap2 && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap2 && !sep6 && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep6, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep6 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap2 && !props.found && ctx.options.strict) {
              if (sep6)
                for (const st of sep6) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep6, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap2) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap2 ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports2.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports2.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type2 = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type: type2, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep6 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type2 === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep6 + indent.slice(trimIndent) + content;
          sep6 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep6 === " ")
            sep6 = "\n";
          else if (!prevMoreIndented && sep6 === "\n")
            sep6 = "\n\n";
          value += sep6 + indent.slice(trimIndent) + content;
          sep6 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep6 === "\n")
            value += "\n";
          else
            sep6 = "\n";
        } else {
          value += sep6 + content;
          sep6 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type: type2, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports2.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type: type2, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type2) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type2}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line = /(.*?)\r?\n/sy;
      let match = line.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep6 = " ";
      let pos = line.lastIndex;
      while (match = line.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep6 === "\n")
            res += sep6;
          else
            sep6 = "\n";
        } else {
          res += sep6 + lm;
          sep6 = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep6 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok2 = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok2 ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports2.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type: type2, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type2)
        scalar.type = type2;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports2.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports2) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports2.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports2.composeEmptyNode = composeEmptyNode;
    exports2.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports2) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports2.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports2.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports2) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type: type2 = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type: type2, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type: type2 } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type2)
        switch (token.type) {
          case "single-quoted-scalar":
            type2 = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type2 = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type2 = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type2 = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type: type2, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type2) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type2;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type: type2, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type: type2, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type: type2, indent, source, end });
        }
      }
    }
    exports2.createScalarToken = createScalarToken;
    exports2.resolveAsScalar = resolveAsScalar;
    exports2.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports2) {
    "use strict";
    var stringify2 = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep: sep6, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep6)
        for (const st of sep6)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports2.stringify = stringify2;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports2) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path19) => {
      let item = cst;
      for (const [field, index] of path19) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path19) => {
      const parent = visit.itemAtPath(cst, path19.slice(0, -1));
      const field = path19[path19.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path19, item, visitor) {
      let ctrl = visitor(item, path19);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci2 = _visit(Object.freeze(path19.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci2 === "number")
              i = ci2 - 1;
            else if (ci2 === BREAK)
              return BREAK;
            else if (ci2 === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path19);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path19) : ctrl;
    }
    exports2.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports2) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar2 = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports2.createScalarToken = cstScalar.createScalarToken;
    exports2.resolveAsScalar = cstScalar.resolveAsScalar;
    exports2.setScalarValue = cstScalar.setScalarValue;
    exports2.stringify = cstStringify.stringify;
    exports2.visit = cstVisit.visit;
    exports2.BOM = BOM;
    exports2.DOCUMENT = DOCUMENT;
    exports2.FLOW_END = FLOW_END;
    exports2.SCALAR = SCALAR;
    exports2.isCollection = isCollection;
    exports2.isScalar = isScalar2;
    exports2.prettyToken = prettyToken;
    exports2.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports2) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports2.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports2) {
    "use strict";
    var LineCounter2 = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports2.LineCounter = LineCounter2;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list2, type2) {
      for (let i = 0; i < list2.length; ++i)
        if (list2[i].type === type2)
          return true;
      return false;
    }
    function findNonEmptyIndex(list2) {
      for (let i = 0; i < list2.length; ++i) {
        switch (list2[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type2 = cst.tokenType(source);
        if (!type2) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type2 === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type2;
          yield* this.step();
          switch (type2) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep6;
          if (scalar.end) {
            sep6 = scalar.end;
            sep6.push(this.sourceToken);
            delete scalar.end;
          } else
            sep6 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep6 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep6 = it.sep;
                  sep6.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep: sep6 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs16 = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs16, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs16);
              } else {
                Object.assign(it, { key: fs16, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs16 = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs16, sep: [] });
              else if (it.sep)
                this.stack.push(fs16);
              else
                Object.assign(it, { key: fs16, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep6 = fc.end.splice(1, fc.end.length);
            sep6.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep6 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type2) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type: type2,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports2.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser2 = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser2.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument2(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser2.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse2(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument2(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify2(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports2.parse = parse2;
    exports2.parseAllDocuments = parseAllDocuments;
    exports2.parseDocument = parseDocument2;
    exports2.stringify = stringify2;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser2 = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports2.Composer = composer.Composer;
    exports2.Document = Document.Document;
    exports2.Schema = Schema.Schema;
    exports2.YAMLError = errors.YAMLError;
    exports2.YAMLParseError = errors.YAMLParseError;
    exports2.YAMLWarning = errors.YAMLWarning;
    exports2.Alias = Alias.Alias;
    exports2.isAlias = identity.isAlias;
    exports2.isCollection = identity.isCollection;
    exports2.isDocument = identity.isDocument;
    exports2.isMap = identity.isMap;
    exports2.isNode = identity.isNode;
    exports2.isPair = identity.isPair;
    exports2.isScalar = identity.isScalar;
    exports2.isSeq = identity.isSeq;
    exports2.Pair = Pair.Pair;
    exports2.Scalar = Scalar.Scalar;
    exports2.YAMLMap = YAMLMap.YAMLMap;
    exports2.YAMLSeq = YAMLSeq.YAMLSeq;
    exports2.CST = cst;
    exports2.Lexer = lexer.Lexer;
    exports2.LineCounter = lineCounter.LineCounter;
    exports2.Parser = parser2.Parser;
    exports2.parse = publicApi.parse;
    exports2.parseAllDocuments = publicApi.parseAllDocuments;
    exports2.parseDocument = publicApi.parseDocument;
    exports2.stringify = publicApi.stringify;
    exports2.visit = visit.visit;
    exports2.visitAsync = visit.visitAsync;
  }
});

// node_modules/ignore/index.js
var require_ignore = __commonJS({
  "node_modules/ignore/index.js"(exports2, module2) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var UNDEFINED = void 0;
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_LITERAL_SPECIAL = /[.*+?()[\]{}^$|\\/]/;
    var BOM = "\uFEFF";
    var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var DOUBLE_SLASH = "//";
    var SLASH_CODE = 47;
    var DOT_CODE = 46;
    var SLASH = "/";
    var TMP_KEY_IGNORE = "node-ignore";
    if (typeof Symbol !== "undefined") {
      TMP_KEY_IGNORE = /* @__PURE__ */ Symbol.for("node-ignore");
    }
    var KEY_IGNORE = TMP_KEY_IGNORE;
    var define = (object, key, value) => {
      Object.defineProperty(object, key, { value });
      return value;
    };
    var RETURN_FALSE = () => false;
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var POSIX_CLASSES = {
      alnum: "0-9A-Za-z",
      alpha: "A-Za-z",
      blank: " \\t",
      cntrl: "\\x00-\\x1f\\x7f",
      digit: "0-9",
      graph: "!-.0-~",
      lower: "a-z",
      print: " -.0-~",
      punct: "!-.:-@\\[-`{-~",
      // git's `sane-ctype.h` classifies \v and \f as control, not space,
      //   unlike C's `isspace`
      space: " \\t\\n\\r",
      upper: "A-Z",
      xdigit: "0-9A-Fa-f"
    };
    var CLASS_MEMBERS_TO_ESCAPE = "\\]^-[";
    var escapeMember = (char) => CLASS_MEMBERS_TO_ESCAPE.indexOf(char) < 0 ? char : ESCAPE + char;
    var NON_SLASH = "(?!\\/)";
    var classSource = (negated, body) => {
      if (negated) {
        return `[^\\/${body}]`;
      }
      const source = `[${body}]`;
      return new RegExp(source).test("/") ? NON_SLASH + source : source;
    };
    var scanBracket = (pattern, start) => {
      const { length } = pattern;
      let index = start + 1;
      let negated = EMPTY;
      const lead = pattern[index];
      if (lead === "!" || lead === "^") {
        negated = "^";
        index++;
      }
      let body = EMPTY;
      let prev = EMPTY;
      for (; ; ) {
        const char = pattern[index];
        if (char === UNDEFINED) {
          return null;
        }
        if (char === ESCAPE) {
          const escaped = pattern[index + 1];
          if (escaped === UNDEFINED) {
            return null;
          }
          body += escapeMember(escaped);
          prev = escaped;
          index++;
        } else if (char === "-" && prev && index + 1 < length && pattern[index + 1] !== "]") {
          index++;
          let to = pattern[index];
          if (to === ESCAPE) {
            to = pattern[index += 1];
          }
          if (prev <= to) {
            body += `-${escapeMember(to)}`;
          }
          prev = EMPTY;
        } else if (char === "[" && pattern[index + 1] === ":") {
          const nameStart = index + 2;
          let end = nameStart;
          while (end < length && pattern[end] !== "]") {
            end++;
          }
          if (end === length) {
            return null;
          }
          if (end > nameStart && pattern[end - 1] === ":") {
            const expanded = POSIX_CLASSES[pattern.slice(nameStart, end - 1)];
            if (expanded === UNDEFINED) {
              return null;
            }
            body += expanded;
            prev = EMPTY;
            index = end;
          } else {
            body += escapeMember("[");
            prev = "[";
            index = nameStart - 2;
          }
        } else {
          body += escapeMember(char);
          prev = char;
        }
        index++;
        if (pattern[index] === "]") {
          return {
            end: index,
            source: classSource(negated, body)
          };
        }
      }
    };
    var NEVER_MATCH = "[]";
    var PLACEHOLDER = "\0";
    var REGEX_RESTORE_PLACEHOLDER = new RegExp(
      `${PLACEHOLDER}(\\d+)${PLACEHOLDER}`,
      "g"
    );
    var TRAILING_WILDCARD = "\uE000";
    var TRAILING_DOUBLESTAR = "\uE001";
    var extractBrackets = (pattern) => {
      const sources = [];
      const hold = (source) => `${PLACEHOLDER}${sources.push(source) - 1}${PLACEHOLDER}`;
      const { length } = pattern;
      let out = EMPTY;
      let index = 0;
      while (index < length) {
        const char = pattern[index];
        if (char === ESCAPE) {
          const escaped = pattern[index + 1];
          if (escaped === UNDEFINED || escaped === SLASH && index + 2 === length) {
            out += hold(NEVER_MATCH);
          } else if (escaped === "*" || escaped === "[" || escaped === SPACE || escaped === ESCAPE) {
            out += pattern.slice(index, index + 2);
          } else {
            out += hold(
              REGEX_LITERAL_SPECIAL.test(escaped) ? ESCAPE + escaped : escaped
            );
          }
          index += 2;
        } else if (char === PLACEHOLDER) {
          out += hold(`[${PLACEHOLDER}]`);
          index++;
        } else if (char === "[") {
          const scanned = scanBracket(pattern, index);
          if (scanned === null) {
            out += hold(NEVER_MATCH);
            index = length;
          } else {
            out += hold(scanned.source);
            index = scanned.end + 1;
          }
        } else {
          out += char;
          index++;
        }
      }
      return {
        source: out,
        sources
      };
    };
    var DIRECT = null;
    var REGEX_INNER_SLASH = /\/(?!$)/;
    var REPLACERS = [
      // Replace (\ ) with ' '
      // Only a space: an escaped tab or other whitespace is already a literal by
      //   the time it reaches here, and a bare tab must be left as one, not turned
      //   into a space.
      // (\ ) -> ' '
      // (\\ ) -> '\\ '
      // (\\\ ) -> '\\ '
      [
        // A run of backslashes is taken whole, from its first one, so no match
        //   ever starts again inside it -- `(\\+?) ` did, which made a long run
        //   quadratic.
        /(\\+)( ?)/g,
        (_, run, space) => space ? run.slice(0, run.length - run.length % 2) + SPACE : run,
        ESCAPE + SPACE
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match) => `\\${match}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]",
        "?"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^",
        SLASH
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/",
        SLASH
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*(?:\\\*\\\*\\\/)+/,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?",
        "*"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        DIRECT,
        (source, pattern) => {
          if (!source || source[0] === "^") {
            return source;
          }
          const anchor = !REGEX_INNER_SLASH.test(pattern) ? "(?:^|\\/)" : "^";
          return anchor + source;
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? str.slice(index + 6) === "\\/" ? "(?:\\/[^\\/]+)+" : "(?:\\/[^\\/]+)*" : `\\/${TRAILING_DOUBLESTAR}`,
        "*"
      ],
      // normal intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule,
        //    coz trailing single wildcard will be handed by [trailing wildcard]
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1, p2) => {
          const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
          return p1 + unescaped;
        },
        "*"
      ],
      // trailing wildcard, held apart from a literal star
      [
        // The step above leaves a trailing `*` alone, so a single `\*` is all that
        //   can be left at the end here. Whether it is a wildcard or a literal
        //   turns on the backslashes the user put in front of it: the escaper has
        //   since doubled every one, so what stands here is those `2N` doubled
        //   backslashes and then the star's own escape. An even number of the
        //   original `N` leaves the star unescaped -- a wildcard -- and an odd
        //   number escapes it -- a literal. This runs while the two are still
        //   distinct, before the unescape steps below collapse the literal onto
        //   the very `\*` a wildcard leaves behind.
        /(^|[^\\])((?:\\\\)*)\\\*$/,
        (match, p1, p2) => (
          // `p2` holds the doubled user backslashes; half of them is `N`.
          p2.length / 2 % 2 === 0 ? p1 + p2 + TRAILING_WILDCARD : match
        ),
        "*"
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE,
        ESCAPE + ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE,
        ESCAPE + ESCAPE
      ],
      [
        // Every real bracket expression -- POSIX classes included -- has already
        //   been held aside by `extractBrackets`, so the only `[` left in the
        //   pattern is an escaped, literal one.
        // `\` is escaped by step 3
        /\\\[([^\]/]*?)(\\*)($|\])/g,
        // '\\[bar]' -> '\\\\[bar\\]'
        (match, range, endEscape, close) => `\\[${range}${cleanRangeBackSlash(endEscape)}${close}`,
        "["
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        DIRECT,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (source) => {
          const last = source[source.length - 1];
          if (!last || last === TRAILING_WILDCARD || last === TRAILING_DOUBLESTAR) {
            return source;
          }
          return last === SLASH ? `${source}$` : `${source}(?=$|\\/$)`;
        }
      ]
    ];
    var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\uE000$/;
    var MODE_IGNORE = "regex";
    var MODE_CHECK_IGNORE = "checkRegex";
    var UNDERSCORE = "_";
    var replaceTrailingWildcard = (_, p1) => {
      const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
      return `${prefix}(?=$|\\/$)`;
    };
    var REGEX_REPLACE_TRAILING_DOUBLESTAR = /\uE001$/;
    var replaceTrailingDoublestar = () => ".+(?=$|\\/$)";
    var WILDCARD = "[^\\/]*";
    var separatorAfter = (run, at) => {
      let separator = EMPTY;
      for (let index = at + 1; index < run.length && !run[index].wildcard; index++) {
        separator += run[index].single;
      }
      return separator;
    };
    var pinWildcards = (source) => {
      if (source.indexOf(WILDCARD) < 0) {
        return source;
      }
      const tokens = [];
      const { length } = source;
      let index = 0;
      while (index < length) {
        const char = source[index];
        if (source.startsWith(WILDCARD, index)) {
          tokens.push({ wildcard: true });
          index += WILDCARD.length;
        } else if (char === "[") {
          let end = index + 1;
          if (source[end] === "^") {
            end++;
          }
          if (source[end] === "]") {
            end++;
          }
          while (end < length && source[end] !== "]") {
            end += source[end] === ESCAPE ? 2 : 1;
          }
          end++;
          tokens.push({ single: source.slice(index, end) });
          index = end;
        } else if (char === ESCAPE) {
          tokens.push({ single: source.slice(index, index + 2) });
          index += 2;
        } else if (char === "(") {
          let depth = 0;
          let end = index;
          do {
            if (source[end] === ESCAPE) {
              end++;
            } else if (source[end] === "(") {
              depth++;
            } else if (source[end] === ")") {
              depth--;
            }
            end++;
          } while (end < length && depth > 0);
          if ("*+?".indexOf(source[end]) >= 0) {
            end++;
          }
          tokens.push({ boundary: source.slice(index, end) });
          index = end;
        } else if (char === "^" || char === "$") {
          tokens.push({ boundary: char });
          index++;
        } else {
          tokens.push({ single: char });
          index++;
        }
      }
      let out = EMPTY;
      let run = [];
      const flush = () => {
        let lastWildcard;
        run.forEach((token, at) => {
          if (token.wildcard) {
            lastWildcard = at;
          }
        });
        run.forEach((token, at) => {
          if (!token.wildcard) {
            out += token.single;
            return;
          }
          out += at === lastWildcard ? WILDCARD : `(?:(?!${separatorAfter(run, at)})[^\\/])*`;
        });
        run = [];
      };
      tokens.forEach((token) => {
        if (token.boundary === void 0) {
          run.push(token);
          return;
        }
        flush();
        out += token.boundary;
      });
      flush();
      return out;
    };
    var makeRegexPrefix = (pattern) => {
      const { source, sources } = extractBrackets(pattern);
      const replaced = REPLACERS.reduce(
        // A pass whose matcher finds nothing hands back the very string it was
        //   given, so asking first costs a search and saves a rewrite. Ten of the
        //   fifteen passes never fire for a typical .gitignore line, and between
        //   them they were 45% of this chain.
        (prev, [matcher, replacer, required]) => {
          if (matcher === DIRECT) {
            return replacer(prev, pattern);
          }
          if (required !== UNDEFINED && prev.indexOf(required) < 0) {
            return prev;
          }
          return matcher.test(prev) ? prev.replace(matcher, replacer.bind(pattern)) : prev;
        },
        source
      );
      return sources.length ? replaced.replace(
        REGEX_RESTORE_PLACEHOLDER,
        (match, index) => sources[index]
      ) : replaced;
    };
    var checkSourceOf = (body, prefix) => {
      if (body[body.length - 1] === SLASH) {
        prefix = makeRegexPrefix(body.slice(0, -1));
      }
      const head = prefix.slice(0, -1);
      const last = prefix[prefix.length - 1];
      return last === TRAILING_WILDCARD ? `${head}$` : last === TRAILING_DOUBLESTAR ? `${head}.*$` : NEVER_MATCH;
    };
    var matchesBasename = (body) => {
      const index = body.indexOf(SLASH);
      return index < 0 || index === body.length - 1;
    };
    var basenameOf = (path19) => {
      const end = path19.length - 1;
      const index = path19.lastIndexOf(
        SLASH,
        path19[end] === SLASH ? end - 1 : end
      );
      return index < 0 ? path19 : path19.slice(index + 1);
    };
    var parentOf = (path19) => {
      if (path19.charCodeAt(0) === SLASH_CODE || path19.indexOf(DOUBLE_SLASH) >= 0) {
        const slices = path19.split(SLASH).filter(Boolean);
        slices.pop();
        return slices.length ? slices.join(SLASH) + SLASH : EMPTY;
      }
      const end = path19.length - 1;
      const cut = path19.lastIndexOf(
        SLASH,
        path19.charCodeAt(end) === SLASH_CODE ? end - 1 : end
      );
      return cut < 0 ? EMPTY : path19.slice(0, cut + 1);
    };
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern);
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
    var IgnoreRule = class {
      constructor(pattern, mark, body, ignoreCase, negative, prefix) {
        this.pattern = pattern;
        this.mark = mark;
        this.negative = negative;
        define(this, "body", body);
        define(this, "ignoreCase", ignoreCase);
        define(this, "regexPrefix", prefix);
      }
      // Worked out on first use and kept behind an own property, the way `regex`
      //   caches itself in `_regex`. Deciding it in the constructor instead would
      //   add a fourth `defineProperty` to every rule ever built, which cost 4% of
      //   every compile -- including the compiles of rules that are never matched
      //   against anything.
      get _basenameOnly() {
        return define(this, "_basenameOnly", matchesBasename(this.body));
      }
      get regex() {
        const key = UNDERSCORE + MODE_IGNORE;
        if (this[key]) {
          return this[key];
        }
        return this._make(MODE_IGNORE, key);
      }
      get checkRegex() {
        const key = UNDERSCORE + MODE_CHECK_IGNORE;
        if (this[key]) {
          return this[key];
        }
        return this._make(MODE_CHECK_IGNORE, key);
      }
      _make(mode, key) {
        const str = pinWildcards(
          mode === MODE_IGNORE ? this.regexPrefix.replace(REGEX_REPLACE_TRAILING_WILDCARD, replaceTrailingWildcard).replace(REGEX_REPLACE_TRAILING_DOUBLESTAR, replaceTrailingDoublestar) : checkSourceOf(this.body, this.regexPrefix)
        );
        const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
        return define(this, key, regex);
      }
    };
    var isLineEnd = (char) => char === "\r" || char === "\n";
    var trimEnd = (body) => {
      let end = body.length;
      while (end && isLineEnd(body[end - 1])) {
        end--;
      }
      const lineEnd = end;
      while (end && body[end - 1] === SPACE) {
        end--;
      }
      if (end === lineEnd) {
        return body.slice(0, end);
      }
      let backslashes = 0;
      while (backslashes < end && body[end - backslashes - 1] === ESCAPE) {
        backslashes++;
      }
      return backslashes % 2 ? body.slice(0, end - 1) + SPACE : body.slice(0, end);
    };
    var createRule = ({
      pattern,
      mark
    }, ignoreCase) => {
      let body = pattern[0] === BOM ? pattern.slice(1) : pattern;
      if (body[0] === "#") {
        return;
      }
      let negative = false;
      if (body[0] === "!") {
        negative = true;
        body = body.slice(1);
      }
      const last = body[body.length - 1];
      if (last === SPACE || last === "\r" || last === "\n") {
        body = trimEnd(body);
      }
      if (!body) {
        return;
      }
      body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regexPrefix = makeRegexPrefix(body);
      return new IgnoreRule(
        pattern,
        mark,
        body,
        ignoreCase,
        negative,
        regexPrefix
      );
    };
    var RuleManager = class {
      constructor(ignoreCase) {
        this._ignoreCase = ignoreCase;
        this._rules = [];
        this._basenameCount = 0;
      }
      _add(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules._rules);
          this._basenameCount += pattern._rules._basenameCount;
          this._added = true;
          return;
        }
        if (isString(pattern)) {
          pattern = {
            pattern
          };
        }
        const rule = checkPattern(pattern.pattern) && createRule(pattern, this._ignoreCase);
        if (rule) {
          this._added = true;
          this._rules.push(rule);
          if (matchesBasename(rule.body)) {
            this._basenameCount++;
          }
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._add, this);
        if (this._added) {
          this._literalRules = UNDEFINED;
        }
        return this._added;
      }
      // Match the literal 'abc/' for `checkIgnore`, last rule wins. Only a rule
      //   ending in a wildcard can match it (see `checkSourceOf`), so the rest
      //   are left out once, rather than tested or compiled for every path.
      testLiteral(path19) {
        const rules = this._literalRules || (this._literalRules = this._rules.filter(
          ({ body }) => body[body.length - (body[body.length - 1] === SLASH ? 2 : 1)] === "*"
        ));
        let ignored = false;
        let unignored = false;
        let matchedRule;
        for (let index = rules.length - 1; index >= 0; index--) {
          const rule = rules[index];
          if (rule.checkRegex.test(path19)) {
            ignored = !rule.negative;
            unignored = rule.negative;
            matchedRule = rule.negative ? UNDEFINED : rule;
            break;
          }
        }
        const ret = {
          ignored,
          unignored
        };
        if (matchedRule) {
          ret.rule = matchedRule;
        }
        return ret;
      }
      // Test one single path without recursively checking parent directories
      //
      // - checkUnignored `boolean` whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // - check `string` either `MODE_IGNORE` or `MODE_CHECK_IGNORE`
      // @returns {TestResult} true if a file is ignored
      test(path19, checkUnignored, mode) {
        let ignored = false;
        let unignored = false;
        let matchedRule;
        const rules = this._rules;
        const { length } = rules;
        const shortcut = this._basenameCount * 2 >= length;
        const basename8 = shortcut ? basenameOf(path19) : path19;
        for (let index = 0; index < length; index++) {
          const rule = rules[index];
          const { negative } = rule;
          const skip = unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored;
          if (!skip && rule[mode].test(
            shortcut && rule._basenameOnly ? basename8 : path19
          )) {
            ignored = !negative;
            unignored = negative;
            matchedRule = negative ? UNDEFINED : rule;
          }
        }
        const ret = {
          ignored,
          unignored
        };
        if (matchedRule) {
          ret.rule = matchedRule;
        }
        return ret;
      }
    };
    var throwError = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path19, originalPath, doThrow) => {
      if (!isString(path19)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path19) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path19)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path19) => {
      const first = path19.charCodeAt(0);
      if (first === SLASH_CODE) {
        return true;
      }
      if (first !== DOT_CODE) {
        return false;
      }
      if (path19.length === 1) {
        return true;
      }
      const second = path19.charCodeAt(1);
      if (second === SLASH_CODE) {
        return true;
      }
      if (second !== DOT_CODE) {
        return false;
      }
      return path19.length === 2 || path19.charCodeAt(2) === SLASH_CODE;
    };
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define(this, KEY_IGNORE, true);
        this._rules = new RuleManager(ignoreCase);
        this._strictPathCheck = !allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      add(pattern) {
        if (this._rules.add(pattern)) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      // @returns {TestResult}
      _test(originalPath, cache3, checkUnignored) {
        const path19 = originalPath && checkPath.convert(originalPath);
        checkPath(
          path19,
          originalPath,
          this._strictPathCheck ? throwError : RETURN_FALSE
        );
        return this._t(path19, cache3, checkUnignored);
      }
      checkIgnore(path19) {
        if (path19.charCodeAt(path19.length - 1) !== SLASH_CODE) {
          return this.test(path19);
        }
        const dir = this._t(path19, this._testCache, true);
        if (dir.ignored) {
          return dir;
        }
        const literal = this._rules.testLiteral(path19);
        return literal.ignored || literal.unignored ? literal : dir;
      }
      _t(path19, cache3, checkUnignored) {
        if (path19 in cache3) {
          return cache3[path19];
        }
        const parentPath = parentOf(path19);
        const parent = parentPath ? this._t(parentPath, cache3, checkUnignored) : UNDEFINED;
        return cache3[path19] = parent && parent.ignored ? parent : this._rules.test(path19, checkUnignored, MODE_IGNORE);
      }
      ignores(path19) {
        return this._test(path19, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path19) => !this.ignores(path19);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path19) {
        return this._test(path19, this._testCache, true);
      }
    };
    var factory = (options) => new Ignore(options);
    var isPathValid = (path19) => checkPath(path19 && checkPath.convert(path19), path19, RETURN_FALSE);
    var setupWindows = () => {
      const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path19) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path19) || isNotRelative(path19);
    };
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && process.platform === "win32"
    ) {
      setupWindows();
    }
    module2.exports = factory;
    factory.default = factory;
    module2.exports.isPathValid = isPathValid;
    define(module2.exports, /* @__PURE__ */ Symbol.for("setupWindows"), setupWindows);
  }
});

// node_modules/events-universal/default.js
var require_default = __commonJS({
  "node_modules/events-universal/default.js"(exports2, module2) {
    module2.exports = require("events");
  }
});

// node_modules/fast-fifo/fixed-size.js
var require_fixed_size = __commonJS({
  "node_modules/fast-fifo/fixed-size.js"(exports2, module2) {
    module2.exports = class FixedFIFO {
      constructor(hwm) {
        if (!(hwm > 0) || (hwm - 1 & hwm) !== 0) throw new Error("Max size for a FixedFIFO should be a power of two");
        this.buffer = new Array(hwm);
        this.mask = hwm - 1;
        this.top = 0;
        this.btm = 0;
        this.next = null;
      }
      clear() {
        this.top = this.btm = 0;
        this.next = null;
        this.buffer.fill(void 0);
      }
      push(data) {
        if (this.buffer[this.top] !== void 0) return false;
        this.buffer[this.top] = data;
        this.top = this.top + 1 & this.mask;
        return true;
      }
      shift() {
        const last = this.buffer[this.btm];
        if (last === void 0) return void 0;
        this.buffer[this.btm] = void 0;
        this.btm = this.btm + 1 & this.mask;
        return last;
      }
      peek() {
        return this.buffer[this.btm];
      }
      isEmpty() {
        return this.buffer[this.btm] === void 0;
      }
    };
  }
});

// node_modules/fast-fifo/index.js
var require_fast_fifo = __commonJS({
  "node_modules/fast-fifo/index.js"(exports2, module2) {
    var FixedFIFO = require_fixed_size();
    module2.exports = class FastFIFO {
      constructor(hwm) {
        this.hwm = hwm || 16;
        this.head = new FixedFIFO(this.hwm);
        this.tail = this.head;
        this.length = 0;
      }
      clear() {
        this.head = this.tail;
        this.head.clear();
        this.length = 0;
      }
      push(val) {
        this.length++;
        if (!this.head.push(val)) {
          const prev = this.head;
          this.head = prev.next = new FixedFIFO(2 * this.head.buffer.length);
          this.head.push(val);
        }
      }
      shift() {
        if (this.length !== 0) this.length--;
        const val = this.tail.shift();
        if (val === void 0 && this.tail.next) {
          const next = this.tail.next;
          this.tail.next = null;
          this.tail = next;
          return this.tail.shift();
        }
        return val;
      }
      peek() {
        const val = this.tail.peek();
        if (val === void 0 && this.tail.next) return this.tail.next.peek();
        return val;
      }
      isEmpty() {
        return this.length === 0;
      }
    };
  }
});

// node_modules/b4a/index.js
var require_b4a = __commonJS({
  "node_modules/b4a/index.js"(exports2, module2) {
    function isBuffer(value) {
      return Buffer.isBuffer(value) || value instanceof Uint8Array;
    }
    function isEncoding(encoding) {
      return Buffer.isEncoding(encoding);
    }
    function alloc(size, fill2, encoding) {
      return Buffer.alloc(size, fill2, encoding);
    }
    function allocUnsafe(size) {
      return Buffer.allocUnsafe(size);
    }
    function allocUnsafeSlow(size) {
      return Buffer.allocUnsafeSlow(size);
    }
    function byteLength(string, encoding) {
      return Buffer.byteLength(string, encoding);
    }
    function compare3(a, b) {
      return Buffer.compare(a, b);
    }
    function concat(buffers, totalLength) {
      return Buffer.concat(buffers, totalLength);
    }
    function copy(source, target, targetStart, start, end) {
      return toBuffer(source).copy(target, targetStart, start, end);
    }
    function equals(a, b) {
      return toBuffer(a).equals(b);
    }
    function fill(buffer, value, offset, end, encoding) {
      return toBuffer(buffer).fill(value, offset, end, encoding);
    }
    function from(value, encodingOrOffset, length) {
      return Buffer.from(value, encodingOrOffset, length);
    }
    function includes(buffer, value, byteOffset, encoding) {
      return toBuffer(buffer).includes(value, byteOffset, encoding);
    }
    function indexOf(buffer, value, byfeOffset, encoding) {
      return toBuffer(buffer).indexOf(value, byfeOffset, encoding);
    }
    function lastIndexOf(buffer, value, byteOffset, encoding) {
      return toBuffer(buffer).lastIndexOf(value, byteOffset, encoding);
    }
    function swap16(buffer) {
      return toBuffer(buffer).swap16();
    }
    function swap32(buffer) {
      return toBuffer(buffer).swap32();
    }
    function swap64(buffer) {
      return toBuffer(buffer).swap64();
    }
    function toBuffer(buffer) {
      if (Buffer.isBuffer(buffer)) return buffer;
      return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    function toString(buffer, encoding, start, end) {
      return toBuffer(buffer).toString(encoding, start, end);
    }
    function toHex(buffer, start, end) {
      return toBuffer(buffer).toString("hex", start, end);
    }
    function write(buffer, string, offset, length, encoding) {
      return toBuffer(buffer).write(string, offset, length, encoding);
    }
    function readDoubleBE(buffer, offset) {
      return toBuffer(buffer).readDoubleBE(offset);
    }
    function readDoubleLE(buffer, offset) {
      return toBuffer(buffer).readDoubleLE(offset);
    }
    function readFloatBE(buffer, offset) {
      return toBuffer(buffer).readFloatBE(offset);
    }
    function readFloatLE(buffer, offset) {
      return toBuffer(buffer).readFloatLE(offset);
    }
    function readInt32BE(buffer, offset) {
      return toBuffer(buffer).readInt32BE(offset);
    }
    function readInt32LE(buffer, offset) {
      return toBuffer(buffer).readInt32LE(offset);
    }
    function readUInt32BE(buffer, offset) {
      return toBuffer(buffer).readUInt32BE(offset);
    }
    function readUInt32LE(buffer, offset) {
      return toBuffer(buffer).readUInt32LE(offset);
    }
    function writeDoubleBE(buffer, value, offset) {
      return toBuffer(buffer).writeDoubleBE(value, offset);
    }
    function writeDoubleLE(buffer, value, offset) {
      return toBuffer(buffer).writeDoubleLE(value, offset);
    }
    function writeFloatBE(buffer, value, offset) {
      return toBuffer(buffer).writeFloatBE(value, offset);
    }
    function writeFloatLE(buffer, value, offset) {
      return toBuffer(buffer).writeFloatLE(value, offset);
    }
    function writeInt32BE(buffer, value, offset) {
      return toBuffer(buffer).writeInt32BE(value, offset);
    }
    function writeInt32LE(buffer, value, offset) {
      return toBuffer(buffer).writeInt32LE(value, offset);
    }
    function writeUInt32BE(buffer, value, offset) {
      return toBuffer(buffer).writeUInt32BE(value, offset);
    }
    function writeUInt32LE(buffer, value, offset) {
      return toBuffer(buffer).writeUInt32LE(value, offset);
    }
    module2.exports = {
      isBuffer,
      isEncoding,
      alloc,
      allocUnsafe,
      allocUnsafeSlow,
      byteLength,
      compare: compare3,
      concat,
      copy,
      equals,
      fill,
      from,
      includes,
      indexOf,
      lastIndexOf,
      swap16,
      swap32,
      swap64,
      toBuffer,
      toString,
      toHex,
      write,
      readDoubleBE,
      readDoubleLE,
      readFloatBE,
      readFloatLE,
      readInt32BE,
      readInt32LE,
      readUInt32BE,
      readUInt32LE,
      writeDoubleBE,
      writeDoubleLE,
      writeFloatBE,
      writeFloatLE,
      writeInt32BE,
      writeInt32LE,
      writeUInt32BE,
      writeUInt32LE
    };
  }
});

// node_modules/text-decoder/lib/pass-through-decoder.js
var require_pass_through_decoder = __commonJS({
  "node_modules/text-decoder/lib/pass-through-decoder.js"(exports2, module2) {
    var b4a = require_b4a();
    module2.exports = class PassThroughDecoder {
      constructor(encoding) {
        this.encoding = encoding;
      }
      get remaining() {
        return 0;
      }
      decode(data) {
        return b4a.toString(data, this.encoding);
      }
      flush() {
        return "";
      }
    };
  }
});

// node_modules/text-decoder/lib/utf8-decoder.js
var require_utf8_decoder = __commonJS({
  "node_modules/text-decoder/lib/utf8-decoder.js"(exports2, module2) {
    var b4a = require_b4a();
    module2.exports = class UTF8Decoder {
      constructor() {
        this._reset();
      }
      get remaining() {
        return this.bytesSeen;
      }
      decode(data) {
        if (data.byteLength === 0) return "";
        if (this.bytesNeeded === 0 && trailingIncomplete(data, 0) === 0) {
          this.bytesSeen = trailingBytesSeen(data);
          return b4a.toString(data, "utf8");
        }
        let result = "";
        let start = 0;
        if (this.bytesNeeded > 0) {
          while (start < data.byteLength) {
            const byte = data[start];
            if (byte < this.lowerBoundary || byte > this.upperBoundary) {
              result += "\uFFFD";
              this._reset();
              break;
            }
            this.lowerBoundary = 128;
            this.upperBoundary = 191;
            this.codePoint = this.codePoint << 6 | byte & 63;
            this.bytesSeen++;
            start++;
            if (this.bytesSeen === this.bytesNeeded) {
              result += String.fromCodePoint(this.codePoint);
              this._reset();
              break;
            }
          }
          if (this.bytesNeeded > 0) return result;
        }
        const trailing = trailingIncomplete(data, start);
        const end = data.byteLength - trailing;
        if (end > start) result += b4a.toString(data, "utf8", start, end);
        for (let i = end; i < data.byteLength; i++) {
          const byte = data[i];
          if (this.bytesNeeded === 0) {
            if (byte <= 127) {
              this.bytesSeen = 0;
              result += String.fromCharCode(byte);
            } else if (byte >= 194 && byte <= 223) {
              this.bytesNeeded = 2;
              this.bytesSeen = 1;
              this.codePoint = byte & 31;
            } else if (byte >= 224 && byte <= 239) {
              if (byte === 224) this.lowerBoundary = 160;
              else if (byte === 237) this.upperBoundary = 159;
              this.bytesNeeded = 3;
              this.bytesSeen = 1;
              this.codePoint = byte & 15;
            } else if (byte >= 240 && byte <= 244) {
              if (byte === 240) this.lowerBoundary = 144;
              else if (byte === 244) this.upperBoundary = 143;
              this.bytesNeeded = 4;
              this.bytesSeen = 1;
              this.codePoint = byte & 7;
            } else {
              this.bytesSeen = 1;
              result += "\uFFFD";
            }
            continue;
          }
          if (byte < this.lowerBoundary || byte > this.upperBoundary) {
            result += "\uFFFD";
            i--;
            this._reset();
            continue;
          }
          this.lowerBoundary = 128;
          this.upperBoundary = 191;
          this.codePoint = this.codePoint << 6 | byte & 63;
          this.bytesSeen++;
          if (this.bytesSeen === this.bytesNeeded) {
            result += String.fromCodePoint(this.codePoint);
            this._reset();
          }
        }
        return result;
      }
      flush() {
        const result = this.bytesNeeded > 0 ? "\uFFFD" : "";
        this._reset();
        return result;
      }
      _reset() {
        this.codePoint = 0;
        this.bytesNeeded = 0;
        this.bytesSeen = 0;
        this.lowerBoundary = 128;
        this.upperBoundary = 191;
      }
    };
    function trailingIncomplete(data, start) {
      const len = data.byteLength;
      if (len <= start) return 0;
      const limit = Math.max(start, len - 4);
      let i = len - 1;
      while (i > limit && (data[i] & 192) === 128) i--;
      if (i < start) return 0;
      const byte = data[i];
      let needed;
      if (byte <= 127) return 0;
      if (byte >= 194 && byte <= 223) needed = 2;
      else if (byte >= 224 && byte <= 239) needed = 3;
      else if (byte >= 240 && byte <= 244) needed = 4;
      else return 0;
      const available = len - i;
      return available < needed ? available : 0;
    }
    function trailingBytesSeen(data) {
      const len = data.byteLength;
      if (len === 0) return 0;
      const last = data[len - 1];
      if (last <= 127) return 0;
      if ((last & 192) !== 128) return 1;
      const limit = Math.max(0, len - 4);
      let i = len - 2;
      while (i >= limit && (data[i] & 192) === 128) i--;
      if (i < 0) return 1;
      const first = data[i];
      let needed;
      if (first >= 194 && first <= 223) needed = 2;
      else if (first >= 224 && first <= 239) needed = 3;
      else if (first >= 240 && first <= 244) needed = 4;
      else return 1;
      if (len - i !== needed) return 1;
      if (needed >= 3) {
        const second = data[i + 1];
        if (first === 224 && second < 160) return 1;
        if (first === 237 && second > 159) return 1;
        if (first === 240 && second < 144) return 1;
        if (first === 244 && second > 143) return 1;
      }
      return 0;
    }
  }
});

// node_modules/text-decoder/index.js
var require_text_decoder = __commonJS({
  "node_modules/text-decoder/index.js"(exports2, module2) {
    var PassThroughDecoder = require_pass_through_decoder();
    var UTF8Decoder = require_utf8_decoder();
    module2.exports = class TextDecoder {
      constructor(encoding = "utf8") {
        this.encoding = normalizeEncoding(encoding);
        switch (this.encoding) {
          case "utf8":
            this.decoder = new UTF8Decoder();
            break;
          case "utf16le":
          case "base64":
            throw new Error("Unsupported encoding: " + this.encoding);
          default:
            this.decoder = new PassThroughDecoder(this.encoding);
        }
      }
      get remaining() {
        return this.decoder.remaining;
      }
      push(data) {
        if (typeof data === "string") return data;
        return this.decoder.decode(data);
      }
      // For Node.js compatibility
      write(data) {
        return this.push(data);
      }
      end(data) {
        let result = "";
        if (data) result = this.push(data);
        result += this.decoder.flush();
        return result;
      }
    };
    function normalizeEncoding(encoding) {
      encoding = encoding.toLowerCase();
      switch (encoding) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return encoding;
        default:
          throw new Error("Unknown encoding: " + encoding);
      }
    }
  }
});

// node_modules/streamx/lib/errors.js
var require_errors2 = __commonJS({
  "node_modules/streamx/lib/errors.js"(exports2, module2) {
    module2.exports = class StreamError extends Error {
      constructor(msg, code, fn = StreamError) {
        super(msg);
        this.code = code;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, fn);
        }
      }
      static isStreamDestroyed(err) {
        return err && err.code === "STREAM_DESTROYED";
      }
      static isPrematureClose(err) {
        return err && err.code === "PREMATURE_CLOSE";
      }
      static isAborted(err) {
        return err && err.code === "ABORTED";
      }
      static isBadArgument(err) {
        return err && err.code === "BAD_ARGUMENT";
      }
      get name() {
        return "StreamError";
      }
      static STREAM_DESTROYED() {
        return new StreamError("Stream was destroyed", "STREAM_DESTROYED", StreamError.STREAM_DESTROYED);
      }
      static PREMATURE_CLOSE(msg = "Premature close") {
        return new StreamError(msg, "PREMATURE_CLOSE", StreamError.PREMATURE_CLOSE);
      }
      static ABORTED() {
        return new StreamError("Stream aborted", "ABORTED", StreamError.ABORTED);
      }
      static BAD_ARGUMENT(msg = "Bad argument") {
        return new StreamError(msg, "BAD_ARGUMENT", StreamError.BAD_ARGUMENT);
      }
    };
  }
});

// node_modules/streamx/index.js
var require_streamx = __commonJS({
  "node_modules/streamx/index.js"(exports2, module2) {
    var { EventEmitter } = require_default();
    var FIFO = require_fast_fifo();
    var TextDecoder2 = require_text_decoder();
    var StreamError = require_errors2();
    var qmt = typeof queueMicrotask === "undefined" ? (fn) => global.process.nextTick(fn) : queueMicrotask;
    var MAX = (1 << 29) - 1;
    var OPENING = 1;
    var PREDESTROYING = 2;
    var DESTROYING = 4;
    var DESTROYED = 8;
    var NOT_OPENING = MAX ^ OPENING;
    var NOT_PREDESTROYING = MAX ^ PREDESTROYING;
    var READ_ACTIVE = 1 << 4;
    var READ_UPDATING = 2 << 4;
    var READ_PRIMARY = 4 << 4;
    var READ_QUEUED = 8 << 4;
    var READ_RESUMED = 16 << 4;
    var READ_PIPE_DRAINED = 32 << 4;
    var READ_ENDING = 64 << 4;
    var READ_EMIT_DATA = 128 << 4;
    var READ_EMIT_READABLE = 256 << 4;
    var READ_EMITTED_READABLE = 512 << 4;
    var READ_DONE = 1024 << 4;
    var READ_NEXT_TICK = 2048 << 4;
    var READ_NEEDS_PUSH = 4096 << 4;
    var READ_READ_AHEAD = 8192 << 4;
    var READ_FLOWING = READ_RESUMED | READ_PIPE_DRAINED;
    var READ_ACTIVE_AND_NEEDS_PUSH = READ_ACTIVE | READ_NEEDS_PUSH;
    var READ_PRIMARY_AND_ACTIVE = READ_PRIMARY | READ_ACTIVE;
    var READ_EMIT_READABLE_AND_QUEUED = READ_EMIT_READABLE | READ_QUEUED;
    var READ_RESUMED_READ_AHEAD = READ_RESUMED | READ_READ_AHEAD;
    var READ_NOT_ACTIVE = MAX ^ READ_ACTIVE;
    var READ_NON_PRIMARY = MAX ^ READ_PRIMARY;
    var READ_NON_PRIMARY_AND_PUSHED = MAX ^ (READ_PRIMARY | READ_NEEDS_PUSH);
    var READ_PUSHED = MAX ^ READ_NEEDS_PUSH;
    var READ_PAUSED = MAX ^ READ_RESUMED;
    var READ_NOT_QUEUED = MAX ^ (READ_QUEUED | READ_EMITTED_READABLE);
    var READ_NOT_ENDING = MAX ^ READ_ENDING;
    var READ_PIPE_NOT_DRAINED = MAX ^ READ_FLOWING;
    var READ_NOT_NEXT_TICK = MAX ^ READ_NEXT_TICK;
    var READ_NOT_UPDATING = MAX ^ READ_UPDATING;
    var READ_NO_READ_AHEAD = MAX ^ READ_READ_AHEAD;
    var READ_PAUSED_NO_READ_AHEAD = MAX ^ READ_RESUMED_READ_AHEAD;
    var WRITE_ACTIVE = 1 << 18;
    var WRITE_UPDATING = 2 << 18;
    var WRITE_PRIMARY = 4 << 18;
    var WRITE_QUEUED = 8 << 18;
    var WRITE_UNDRAINED = 16 << 18;
    var WRITE_DONE = 32 << 18;
    var WRITE_EMIT_DRAIN = 64 << 18;
    var WRITE_NEXT_TICK = 128 << 18;
    var WRITE_WRITING = 256 << 18;
    var WRITE_FINISHING = 512 << 18;
    var WRITE_CORKED = 1024 << 18;
    var WRITE_NOT_ACTIVE = MAX ^ (WRITE_ACTIVE | WRITE_WRITING);
    var WRITE_NON_PRIMARY = MAX ^ WRITE_PRIMARY;
    var WRITE_NOT_FINISHING = MAX ^ (WRITE_ACTIVE | WRITE_FINISHING);
    var WRITE_DRAINED = MAX ^ WRITE_UNDRAINED;
    var WRITE_NOT_QUEUED = MAX ^ WRITE_QUEUED;
    var WRITE_NOT_NEXT_TICK = MAX ^ WRITE_NEXT_TICK;
    var WRITE_NOT_UPDATING = MAX ^ WRITE_UPDATING;
    var WRITE_NOT_CORKED = MAX ^ WRITE_CORKED;
    var ACTIVE = READ_ACTIVE | WRITE_ACTIVE;
    var NOT_ACTIVE = MAX ^ ACTIVE;
    var DONE = READ_DONE | WRITE_DONE;
    var DESTROY_STATUS = DESTROYING | DESTROYED | PREDESTROYING;
    var OPEN_STATUS = DESTROY_STATUS | OPENING;
    var AUTO_DESTROY = DESTROY_STATUS | DONE;
    var NON_PRIMARY = WRITE_NON_PRIMARY & READ_NON_PRIMARY;
    var ACTIVE_OR_TICKING = WRITE_NEXT_TICK | READ_NEXT_TICK;
    var TICKING = ACTIVE_OR_TICKING & NOT_ACTIVE;
    var IS_OPENING = OPEN_STATUS | TICKING;
    var READ_PRIMARY_STATUS = OPEN_STATUS | READ_ENDING | READ_DONE;
    var READ_STATUS = OPEN_STATUS | READ_DONE | READ_QUEUED;
    var READ_ENDING_STATUS = OPEN_STATUS | READ_ENDING | READ_QUEUED;
    var READ_READABLE_STATUS = OPEN_STATUS | READ_EMIT_READABLE | READ_QUEUED | READ_EMITTED_READABLE;
    var SHOULD_NOT_READ = OPEN_STATUS | READ_ACTIVE | READ_ENDING | READ_DONE | READ_NEEDS_PUSH | READ_READ_AHEAD;
    var READ_BACKPRESSURE_STATUS = DESTROY_STATUS | READ_ENDING | READ_DONE;
    var READ_UPDATE_SYNC_STATUS = READ_UPDATING | OPEN_STATUS | READ_NEXT_TICK | READ_PRIMARY;
    var READ_NEXT_TICK_OR_OPENING = READ_NEXT_TICK | OPENING;
    var WRITE_PRIMARY_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_DONE;
    var WRITE_QUEUED_AND_UNDRAINED = WRITE_QUEUED | WRITE_UNDRAINED;
    var WRITE_QUEUED_AND_ACTIVE = WRITE_QUEUED | WRITE_ACTIVE;
    var WRITE_DRAIN_STATUS = WRITE_QUEUED | WRITE_UNDRAINED | OPEN_STATUS | WRITE_ACTIVE;
    var WRITE_STATUS = OPEN_STATUS | WRITE_ACTIVE | WRITE_QUEUED | WRITE_CORKED;
    var WRITE_PRIMARY_AND_ACTIVE = WRITE_PRIMARY | WRITE_ACTIVE;
    var WRITE_ACTIVE_AND_WRITING = WRITE_ACTIVE | WRITE_WRITING;
    var WRITE_FINISHING_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_QUEUED_AND_ACTIVE | WRITE_DONE;
    var WRITE_BACKPRESSURE_STATUS = WRITE_UNDRAINED | DESTROY_STATUS | WRITE_FINISHING | WRITE_DONE;
    var WRITE_UPDATE_SYNC_STATUS = WRITE_UPDATING | OPEN_STATUS | WRITE_NEXT_TICK | WRITE_PRIMARY;
    var WRITE_DROP_DATA = WRITE_FINISHING | WRITE_DONE | DESTROY_STATUS;
    var asyncIterator = Symbol.asyncIterator || /* @__PURE__ */ Symbol("asyncIterator");
    var WritableState = class {
      constructor(stream, { highWaterMark = 16384, map = null, mapWritable, byteLength, byteLengthWritable } = {}) {
        this.stream = stream;
        this.queue = new FIFO();
        this.highWaterMark = highWaterMark;
        this.buffered = 0;
        this.error = null;
        this.pipeline = null;
        this.drains = null;
        this.byteLength = byteLengthWritable || byteLength || defaultByteLength;
        this.map = mapWritable || map;
        this.afterWrite = afterWrite.bind(this);
        this.afterUpdateNextTick = updateWriteNT.bind(this);
      }
      get ending() {
        return (this.stream._duplexState & WRITE_FINISHING) !== 0;
      }
      get ended() {
        return (this.stream._duplexState & WRITE_DONE) !== 0;
      }
      push(data) {
        if ((this.stream._duplexState & WRITE_DROP_DATA) !== 0) return false;
        if (this.map !== null) data = this.map(data);
        this.buffered += this.byteLength(data);
        this.queue.push(data);
        if (this.buffered < this.highWaterMark) {
          this.stream._duplexState |= WRITE_QUEUED;
          return true;
        }
        this.stream._duplexState |= WRITE_QUEUED_AND_UNDRAINED;
        return false;
      }
      shift() {
        const data = this.queue.shift();
        this.buffered -= this.byteLength(data);
        if (this.buffered === 0) this.stream._duplexState &= WRITE_NOT_QUEUED;
        return data;
      }
      end(data) {
        if (typeof data === "function") {
          this.stream.once("finish", data);
        } else if (data !== void 0 && data !== null) {
          this.push(data);
        }
        this.stream._duplexState = (this.stream._duplexState | WRITE_FINISHING) & WRITE_NON_PRIMARY;
      }
      autoBatch(data, cb) {
        const buffer = [];
        const stream = this.stream;
        buffer.push(data);
        while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED_AND_ACTIVE) {
          buffer.push(stream._writableState.shift());
        }
        if ((stream._duplexState & OPEN_STATUS) !== 0) return cb(null);
        stream._writev(buffer, cb);
      }
      update() {
        const stream = this.stream;
        stream._duplexState |= WRITE_UPDATING;
        do {
          while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED) {
            const data = this.shift();
            stream._duplexState |= WRITE_ACTIVE_AND_WRITING;
            stream._write(data, this.afterWrite);
          }
          if ((stream._duplexState & WRITE_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary();
        } while (this.continueUpdate() === true);
        stream._duplexState &= WRITE_NOT_UPDATING;
      }
      updateNonPrimary() {
        const stream = this.stream;
        if ((stream._duplexState & WRITE_FINISHING_STATUS) === WRITE_FINISHING) {
          stream._duplexState = stream._duplexState | WRITE_ACTIVE;
          stream._final(afterFinal.bind(this));
          return;
        }
        if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
          if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
            stream._duplexState |= ACTIVE;
            stream._destroy(afterDestroy.bind(this));
          }
          return;
        }
        if ((stream._duplexState & IS_OPENING) === OPENING) {
          stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
          stream._open(afterOpen.bind(this));
        }
      }
      continueUpdate() {
        if ((this.stream._duplexState & WRITE_NEXT_TICK) === 0) return false;
        this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
        return true;
      }
      updateCallback() {
        if ((this.stream._duplexState & WRITE_UPDATE_SYNC_STATUS) === WRITE_PRIMARY) {
          this.update();
        } else {
          this.updateNextTick();
        }
      }
      updateNextTick() {
        if ((this.stream._duplexState & WRITE_NEXT_TICK) !== 0) return;
        this.stream._duplexState |= WRITE_NEXT_TICK;
        if ((this.stream._duplexState & WRITE_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
    };
    var ReadableState = class {
      constructor(stream, { highWaterMark = 16384, map = null, mapReadable, byteLength, byteLengthReadable } = {}) {
        this.stream = stream;
        this.queue = new FIFO();
        this.highWaterMark = highWaterMark === 0 ? 1 : highWaterMark;
        this.buffered = 0;
        this.readAhead = highWaterMark > 0;
        this.error = null;
        this.pipeline = null;
        this.byteLength = byteLengthReadable || byteLength || defaultByteLength;
        this.map = mapReadable || map;
        this.pipeTo = null;
        this.afterRead = afterRead.bind(this);
        this.afterUpdateNextTick = updateReadNT.bind(this);
      }
      get ending() {
        return (this.stream._duplexState & READ_ENDING) !== 0;
      }
      get ended() {
        return (this.stream._duplexState & READ_DONE) !== 0;
      }
      pipe(pipeTo, cb) {
        if (this.pipeTo !== null) throw StreamError.BAD_ARGUMENT("Can only pipe to one destination");
        if (typeof cb !== "function") cb = null;
        this.stream._duplexState |= READ_PIPE_DRAINED;
        this.pipeTo = pipeTo;
        this.pipeline = new Pipeline(this.stream, pipeTo, cb);
        if (cb) this.stream.on("error", noop);
        if (isStreamx(pipeTo)) {
          pipeTo._writableState.pipeline = this.pipeline;
          if (cb) pipeTo.on("error", noop);
          pipeTo.on("finish", this.pipeline.finished.bind(this.pipeline));
        } else {
          const onerror = this.pipeline.done.bind(this.pipeline, pipeTo);
          const onclose = this.pipeline.done.bind(this.pipeline, pipeTo, null);
          pipeTo.on("error", onerror);
          pipeTo.on("close", onclose);
          pipeTo.on("finish", this.pipeline.finished.bind(this.pipeline));
        }
        pipeTo.on("drain", afterDrain.bind(this));
        this.stream.emit("piping", pipeTo);
        pipeTo.emit("pipe", this.stream);
      }
      push(data) {
        const stream = this.stream;
        if (data === null) {
          this.highWaterMark = 0;
          stream._duplexState = (stream._duplexState | READ_ENDING) & READ_NON_PRIMARY_AND_PUSHED;
          return false;
        }
        if (this.map !== null) {
          data = this.map(data);
          if (data === null) {
            stream._duplexState &= READ_PUSHED;
            return this.buffered < this.highWaterMark;
          }
        }
        this.buffered += this.byteLength(data);
        this.queue.push(data);
        stream._duplexState = (stream._duplexState | READ_QUEUED) & READ_PUSHED;
        return this.buffered < this.highWaterMark;
      }
      shift() {
        const data = this.queue.shift();
        this.buffered -= this.byteLength(data);
        if (this.buffered === 0) {
          this.stream._duplexState &= READ_NOT_QUEUED;
        }
        return data;
      }
      unshift(data) {
        const pending = [this.map !== null ? this.map(data) : data];
        while (this.buffered > 0) pending.push(this.shift());
        for (let i = 0; i < pending.length - 1; i++) {
          const data2 = pending[i];
          this.buffered += this.byteLength(data2);
          this.queue.push(data2);
        }
        this.push(pending[pending.length - 1]);
      }
      read() {
        const stream = this.stream;
        if ((stream._duplexState & READ_STATUS) === READ_QUEUED) {
          const data = this.shift();
          if (this.pipeTo !== null && this.pipeTo.write(data) === false) {
            stream._duplexState &= READ_PIPE_NOT_DRAINED;
          }
          if ((stream._duplexState & READ_EMIT_DATA) !== 0) {
            stream.emit("data", data);
          }
          return data;
        }
        if (this.readAhead === false) {
          stream._duplexState |= READ_READ_AHEAD;
          this.updateNextTick();
        }
        return null;
      }
      drain() {
        const stream = this.stream;
        while ((stream._duplexState & READ_STATUS) === READ_QUEUED && (stream._duplexState & READ_FLOWING) !== 0) {
          const data = this.shift();
          if (this.pipeTo !== null && this.pipeTo.write(data) === false) {
            stream._duplexState &= READ_PIPE_NOT_DRAINED;
          }
          if ((stream._duplexState & READ_EMIT_DATA) !== 0) {
            stream.emit("data", data);
          }
        }
      }
      update() {
        const stream = this.stream;
        stream._duplexState |= READ_UPDATING;
        do {
          this.drain();
          while (this.buffered < this.highWaterMark && (stream._duplexState & SHOULD_NOT_READ) === READ_READ_AHEAD) {
            stream._duplexState |= READ_ACTIVE_AND_NEEDS_PUSH;
            stream._read(this.afterRead);
            this.drain();
          }
          if ((stream._duplexState & READ_READABLE_STATUS) === READ_EMIT_READABLE_AND_QUEUED) {
            stream._duplexState |= READ_EMITTED_READABLE;
            stream.emit("readable");
          }
          if ((stream._duplexState & READ_PRIMARY_AND_ACTIVE) === 0) {
            this.updateNonPrimary();
          }
        } while (this.continueUpdate() === true);
        stream._duplexState &= READ_NOT_UPDATING;
      }
      updateNonPrimary() {
        const stream = this.stream;
        if ((stream._duplexState & READ_ENDING_STATUS) === READ_ENDING) {
          stream._duplexState = (stream._duplexState | READ_DONE) & READ_NOT_ENDING;
          stream.emit("end");
          if ((stream._duplexState & AUTO_DESTROY) === DONE) {
            stream._duplexState |= DESTROYING;
          }
          if (this.pipeTo !== null) {
            this.pipeTo.end();
          }
        }
        if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
          if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
            stream._duplexState |= ACTIVE;
            stream._destroy(afterDestroy.bind(this));
          }
          return;
        }
        if ((stream._duplexState & IS_OPENING) === OPENING) {
          stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
          stream._open(afterOpen.bind(this));
        }
      }
      continueUpdate() {
        if ((this.stream._duplexState & READ_NEXT_TICK) === 0) return false;
        this.stream._duplexState &= READ_NOT_NEXT_TICK;
        return true;
      }
      updateCallback() {
        if ((this.stream._duplexState & READ_UPDATE_SYNC_STATUS) === READ_PRIMARY) {
          this.update();
        } else {
          this.updateNextTick();
        }
      }
      updateNextTickIfOpen() {
        if ((this.stream._duplexState & READ_NEXT_TICK_OR_OPENING) !== 0) return;
        this.stream._duplexState |= READ_NEXT_TICK;
        if ((this.stream._duplexState & READ_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
      updateNextTick() {
        if ((this.stream._duplexState & READ_NEXT_TICK) !== 0) return;
        this.stream._duplexState |= READ_NEXT_TICK;
        if ((this.stream._duplexState & READ_UPDATING) === 0) qmt(this.afterUpdateNextTick);
      }
    };
    var TransformState = class {
      constructor(stream) {
        this.data = null;
        this.afterTransform = afterTransform.bind(stream);
        this.afterFinal = null;
      }
    };
    var Pipeline = class {
      constructor(src, dst, cb) {
        this.from = src;
        this.to = dst;
        this.afterPipe = cb;
        this.error = null;
        this.pipeToFinished = false;
      }
      finished() {
        this.pipeToFinished = true;
      }
      done(stream, err) {
        if (err) this.error = err;
        if (stream === this.to) {
          this.to = null;
          if (this.from !== null) {
            if ((this.from._duplexState & READ_DONE) === 0 || !this.pipeToFinished) {
              this.from.destroy(this.error || StreamError.PREMATURE_CLOSE("Writable stream closed"));
            }
            return;
          }
        }
        if (stream === this.from) {
          this.from = null;
          if (this.to !== null) {
            if ((stream._duplexState & READ_DONE) === 0) {
              this.to.destroy(this.error || StreamError.PREMATURE_CLOSE("Readable stream closed"));
            }
            return;
          }
        }
        if (this.afterPipe !== null) this.afterPipe(this.error);
        this.to = this.from = this.afterPipe = null;
      }
    };
    function afterDrain() {
      this.stream._duplexState |= READ_PIPE_DRAINED;
      this.updateCallback();
    }
    function afterFinal(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      if ((stream._duplexState & DESTROY_STATUS) === 0) {
        stream._duplexState |= WRITE_DONE;
        stream.emit("finish");
      }
      if ((stream._duplexState & AUTO_DESTROY) === DONE) {
        stream._duplexState |= DESTROYING;
      }
      stream._duplexState &= WRITE_NOT_FINISHING;
      if ((stream._duplexState & WRITE_UPDATING) === 0) {
        this.update();
      } else {
        this.updateNextTick();
      }
    }
    function afterDestroy(err) {
      const stream = this.stream;
      if (!err && !StreamError.isStreamDestroyed(this.error)) err = this.error;
      if (err) stream.emit("error", err);
      stream._duplexState |= DESTROYED;
      stream.emit("close");
      const rs = stream._readableState;
      const ws = stream._writableState;
      if (rs !== null && rs.pipeline !== null) {
        rs.pipeline.done(stream, err);
      }
      if (ws !== null) {
        while (ws.drains !== null && ws.drains.length > 0) {
          ws.drains.shift().resolve(false);
        }
        if (ws.pipeline !== null) {
          ws.pipeline.done(stream, err);
        }
      }
    }
    function afterWrite(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      stream._duplexState &= WRITE_NOT_ACTIVE;
      if (this.drains !== null) tickDrains(this.drains);
      if ((stream._duplexState & WRITE_DRAIN_STATUS) === WRITE_UNDRAINED) {
        stream._duplexState &= WRITE_DRAINED;
        if ((stream._duplexState & WRITE_EMIT_DRAIN) === WRITE_EMIT_DRAIN) {
          stream.emit("drain");
        }
      }
      this.updateCallback();
    }
    function afterRead(err) {
      if (err) this.stream.destroy(err);
      this.stream._duplexState &= READ_NOT_ACTIVE;
      if (this.readAhead === false && (this.stream._duplexState & READ_RESUMED) === 0) {
        this.stream._duplexState &= READ_NO_READ_AHEAD;
      }
      this.updateCallback();
    }
    function updateReadNT() {
      if ((this.stream._duplexState & READ_UPDATING) === 0) {
        this.stream._duplexState &= READ_NOT_NEXT_TICK;
        this.update();
      }
    }
    function updateWriteNT() {
      if ((this.stream._duplexState & WRITE_UPDATING) === 0) {
        this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
        this.update();
      }
    }
    function tickDrains(drains) {
      for (let i = 0; i < drains.length; i++) {
        if (--drains[i].writes === 0) {
          drains.shift().resolve(true);
          i--;
        }
      }
    }
    function afterOpen(err) {
      const stream = this.stream;
      if (err) stream.destroy(err);
      if ((stream._duplexState & DESTROYING) === 0) {
        if ((stream._duplexState & READ_PRIMARY_STATUS) === 0) {
          stream._duplexState |= READ_PRIMARY;
        }
        if ((stream._duplexState & WRITE_PRIMARY_STATUS) === 0) {
          stream._duplexState |= WRITE_PRIMARY;
        }
        stream.emit("open");
      }
      stream._duplexState &= NOT_ACTIVE;
      if (stream._writableState !== null) {
        stream._writableState.updateCallback();
      }
      if (stream._readableState !== null) {
        stream._readableState.updateCallback();
      }
    }
    function afterTransform(err, data) {
      if (data !== void 0 && data !== null) this.push(data);
      this._writableState.afterWrite(err);
    }
    function newListener(name) {
      if (this._readableState !== null) {
        if (name === "data") {
          this._duplexState |= READ_EMIT_DATA | READ_RESUMED_READ_AHEAD;
          this._readableState.updateNextTick();
        }
        if (name === "readable") {
          this._duplexState |= READ_EMIT_READABLE;
          this._readableState.updateNextTick();
        }
      }
      if (this._writableState !== null) {
        if (name === "drain") {
          this._duplexState |= WRITE_EMIT_DRAIN;
          this._writableState.updateNextTick();
        }
      }
    }
    var Stream = class extends EventEmitter {
      constructor(opts) {
        super();
        this._duplexState = 0;
        this._readableState = null;
        this._writableState = null;
        if (opts) {
          if (opts.open) this._open = opts.open;
          if (opts.destroy) this._destroy = opts.destroy;
          if (opts.predestroy) this._predestroy = opts.predestroy;
          if (opts.signal) opts.signal.addEventListener("abort", abort.bind(this));
        }
        this.on("newListener", newListener);
      }
      _open(cb) {
        cb(null);
      }
      _destroy(cb) {
        cb(null);
      }
      _predestroy() {
      }
      get readable() {
        return this._readableState !== null ? true : void 0;
      }
      get writable() {
        return this._writableState !== null ? true : void 0;
      }
      get destroyed() {
        return (this._duplexState & DESTROYED) !== 0;
      }
      get destroying() {
        return (this._duplexState & DESTROY_STATUS) !== 0;
      }
      destroy(err) {
        if ((this._duplexState & DESTROY_STATUS) === 0) {
          if (!err) err = StreamError.STREAM_DESTROYED();
          this._duplexState = (this._duplexState | DESTROYING) & NON_PRIMARY;
          if (this._readableState !== null) {
            this._readableState.highWaterMark = 0;
            this._readableState.error = err;
          }
          if (this._writableState !== null) {
            this._writableState.highWaterMark = 0;
            this._writableState.error = err;
          }
          this._duplexState |= PREDESTROYING;
          this._predestroy();
          this._duplexState &= NOT_PREDESTROYING;
          if (this._readableState !== null) {
            this._readableState.updateNextTick();
          }
          if (this._writableState !== null) {
            this._writableState.updateNextTick();
          }
        }
      }
    };
    var Readable2 = class _Readable extends Stream {
      constructor(opts) {
        super(opts);
        this._duplexState |= OPENING | WRITE_DONE | READ_READ_AHEAD;
        this._readableState = new ReadableState(this, opts);
        if (opts) {
          if (this._readableState.readAhead === false) this._duplexState &= READ_NO_READ_AHEAD;
          if (opts.read) this._read = opts.read;
          if (opts.eagerOpen) this._readableState.updateNextTick();
          if (opts.encoding) this.setEncoding(opts.encoding);
        }
      }
      static deferred(fn, opts) {
        const out = new PassThrough(opts);
        fn().then((src) => {
          if (src === null) return out.end();
          if (out.destroying) return;
          pipeline2(src, out, noop);
        }).catch((err) => out.destroy(err));
        return out;
      }
      setEncoding(encoding) {
        const dec = new TextDecoder2(encoding);
        const map = this._readableState.map || echo;
        this._readableState.map = mapOrSkip;
        return this;
        function mapOrSkip(data) {
          const next = dec.push(data);
          return next === "" && (data.byteLength !== 0 || dec.remaining > 0) ? null : map(next);
        }
      }
      _read(cb) {
        cb(null);
      }
      pipe(dest, cb) {
        this._readableState.updateNextTick();
        this._readableState.pipe(dest, cb);
        return dest;
      }
      read() {
        this._readableState.updateNextTick();
        return this._readableState.read();
      }
      push(data) {
        this._readableState.updateNextTickIfOpen();
        return this._readableState.push(data);
      }
      unshift(data) {
        this._readableState.updateNextTickIfOpen();
        return this._readableState.unshift(data);
      }
      resume() {
        this._duplexState |= READ_RESUMED_READ_AHEAD;
        this._readableState.updateNextTick();
        return this;
      }
      pause() {
        this._duplexState &= this._readableState.readAhead === false ? READ_PAUSED_NO_READ_AHEAD : READ_PAUSED;
        return this;
      }
      static _fromAsyncIterator(ite, opts) {
        let destroy;
        const rs = new _Readable({
          ...opts,
          read(cb) {
            ite.next().then(push).then(cb.bind(null, null)).catch(cb);
          },
          predestroy() {
            destroy = ite.return();
          },
          destroy(cb) {
            if (!destroy) return cb(null);
            destroy.then(cb.bind(null, null)).catch(cb);
          }
        });
        return rs;
        function push(data) {
          if (data.done) rs.push(null);
          else rs.push(data.value);
        }
      }
      static from(data, opts) {
        if (isReadStreamx(data)) return data;
        if (data[asyncIterator]) return this._fromAsyncIterator(data[asyncIterator](), opts);
        if (!Array.isArray(data)) data = data === void 0 ? [] : [data];
        let i = 0;
        return new _Readable({
          ...opts,
          read(cb) {
            this.push(i === data.length ? null : data[i++]);
            cb(null);
          }
        });
      }
      static isBackpressured(rs) {
        return (rs._duplexState & READ_BACKPRESSURE_STATUS) !== 0 || rs._readableState.buffered >= rs._readableState.highWaterMark;
      }
      static isPaused(rs) {
        return (rs._duplexState & READ_RESUMED) === 0;
      }
      [asyncIterator]() {
        const stream = this;
        let error = null;
        let promiseResolve = null;
        let promiseReject = null;
        this.on("error", (err) => {
          error = err;
        });
        this.on("readable", onreadable);
        this.on("close", onclose);
        return {
          [asyncIterator]() {
            return this;
          },
          next() {
            return new Promise(function(resolve10, reject) {
              promiseResolve = resolve10;
              promiseReject = reject;
              const data = stream.read();
              if (data !== null) ondata(data);
              else if ((stream._duplexState & DESTROYED) !== 0) ondata(null);
            });
          },
          return() {
            return destroy(null);
          },
          throw(err) {
            return destroy(err);
          }
        };
        function onreadable() {
          if (promiseResolve !== null) ondata(stream.read());
        }
        function onclose() {
          if (promiseResolve !== null) ondata(null);
        }
        function ondata(data) {
          if (promiseReject === null) return;
          if (error) {
            promiseReject(error);
          } else if (data === null && (stream._duplexState & READ_DONE) === 0) {
            promiseReject(StreamError.STREAM_DESTROYED());
          } else {
            promiseResolve({ value: data, done: data === null });
          }
          promiseReject = promiseResolve = null;
        }
        function destroy(err) {
          stream.destroy(err);
          return new Promise((resolve10, reject) => {
            if (stream._duplexState & DESTROYED) return resolve10({ value: void 0, done: true });
            stream.once("close", function() {
              if (err) reject(err);
              else resolve10({ value: void 0, done: true });
            });
          });
        }
      }
    };
    var Writable = class extends Stream {
      constructor(opts) {
        super(opts);
        this._duplexState |= OPENING | READ_DONE;
        this._writableState = new WritableState(this, opts);
        if (opts) {
          if (opts.writev) this._writev = opts.writev;
          if (opts.write) this._write = opts.write;
          if (opts.final) this._final = opts.final;
          if (opts.eagerOpen) this._writableState.updateNextTick();
        }
      }
      cork() {
        this._duplexState |= WRITE_CORKED;
      }
      uncork() {
        this._duplexState &= WRITE_NOT_CORKED;
        this._writableState.updateNextTick();
      }
      _writev(batch, cb) {
        cb(null);
      }
      _write(data, cb) {
        this._writableState.autoBatch(data, cb);
      }
      _final(cb) {
        cb(null);
      }
      static isBackpressured(ws) {
        return (ws._duplexState & WRITE_BACKPRESSURE_STATUS) !== 0;
      }
      static drained(ws) {
        if (ws.destroyed) return Promise.resolve(false);
        const state = ws._writableState;
        const pending = isWritev(ws) ? Math.min(1, state.queue.length) : state.queue.length;
        const writes = pending + (ws._duplexState & WRITE_WRITING ? 1 : 0);
        if (writes === 0) return Promise.resolve(true);
        if (state.drains === null) state.drains = [];
        return new Promise((resolve10) => {
          state.drains.push({ writes, resolve: resolve10 });
        });
      }
      write(data) {
        this._writableState.updateNextTick();
        return this._writableState.push(data);
      }
      end(data) {
        this._writableState.updateNextTick();
        this._writableState.end(data);
        return this;
      }
    };
    var Duplex = class extends Readable2 {
      // and Writable
      constructor(opts) {
        super(opts);
        this._duplexState = OPENING | this._duplexState & READ_READ_AHEAD;
        this._writableState = new WritableState(this, opts);
        if (opts) {
          if (opts.writev) this._writev = opts.writev;
          if (opts.write) this._write = opts.write;
          if (opts.final) this._final = opts.final;
        }
      }
      cork() {
        this._duplexState |= WRITE_CORKED;
      }
      uncork() {
        this._duplexState &= WRITE_NOT_CORKED;
        this._writableState.updateNextTick();
      }
      _writev(batch, cb) {
        cb(null);
      }
      _write(data, cb) {
        this._writableState.autoBatch(data, cb);
      }
      _final(cb) {
        cb(null);
      }
      write(data) {
        this._writableState.updateNextTick();
        return this._writableState.push(data);
      }
      end(data) {
        this._writableState.updateNextTick();
        this._writableState.end(data);
        return this;
      }
    };
    var Transform = class extends Duplex {
      constructor(opts) {
        super(opts);
        this._transformState = new TransformState(this);
        if (opts) {
          if (opts.transform) this._transform = opts.transform;
          if (opts.flush) this._flush = opts.flush;
        }
      }
      _write(data, cb) {
        if (this._readableState.buffered >= this._readableState.highWaterMark) {
          this._transformState.data = data;
        } else {
          this._transform(data, this._transformState.afterTransform);
        }
      }
      _read(cb) {
        if (this._transformState.data !== null) {
          const data = this._transformState.data;
          this._transformState.data = null;
          cb(null);
          this._transform(data, this._transformState.afterTransform);
        } else {
          cb(null);
        }
      }
      destroy(err) {
        super.destroy(err);
        if (this._transformState.data !== null) {
          this._transformState.data = null;
          this._transformState.afterTransform();
        }
      }
      _transform(data, cb) {
        cb(null, data);
      }
      _flush(cb) {
        cb(null);
      }
      _final(cb) {
        this._transformState.afterFinal = cb;
        this._flush(transformAfterFlush.bind(this));
      }
    };
    var PassThrough = class extends Transform {
    };
    function transformAfterFlush(err, data) {
      const cb = this._transformState.afterFinal;
      if (err) return cb(err);
      if (data !== null && data !== void 0) this.push(data);
      this.push(null);
      cb(null);
    }
    function pipelinePromise(...streams) {
      return new Promise((resolve10, reject) => {
        return pipeline2(...streams, (err) => {
          if (err) return reject(err);
          resolve10();
        });
      });
    }
    function pipeline2(stream, ...streams) {
      const all = Array.isArray(stream) ? [...stream, ...streams] : [stream, ...streams];
      const done = all.length && typeof all[all.length - 1] === "function" ? all.pop() : null;
      if (all.length < 2) throw StreamError.BAD_ARGUMENT("Pipeline requires at least 2 streams");
      let src = all[0];
      let dest = null;
      let error = null;
      for (let i = 1; i < all.length; i++) {
        dest = all[i];
        if (isStreamx(src)) {
          src.pipe(dest, onerror);
        } else {
          errorHandle(src, true, i > 1, onerror);
          src.pipe(dest);
        }
        src = dest;
      }
      if (done) {
        let fin = false;
        const autoDestroy = isStreamx(dest) || !!(dest._writableState && dest._writableState.autoDestroy);
        dest.on("error", (err) => {
          if (error === null) error = err;
        });
        dest.on("finish", () => {
          fin = true;
          if (!autoDestroy) done(error);
        });
        if (autoDestroy) {
          dest.on("close", () => done(error || (fin ? null : StreamError.PREMATURE_CLOSE())));
        }
      }
      return dest;
      function errorHandle(s, rd, wr, onerror2) {
        s.on("error", onerror2);
        s.on("close", onclose);
        function onclose() {
          if (rd && s._readableState && !s._readableState.ended) {
            return onerror2(StreamError.PREMATURE_CLOSE());
          }
          if (wr && s._writableState && !s._writableState.ended) {
            return onerror2(StreamError.PREMATURE_CLOSE());
          }
        }
      }
      function onerror(err) {
        if (!err || error) return;
        error = err;
        for (const s of all) {
          s.destroy(err);
        }
      }
    }
    function echo(s) {
      return s;
    }
    function isStream(stream) {
      return !!stream._readableState || !!stream._writableState;
    }
    function isStreamx(stream) {
      return typeof stream._duplexState === "number" && isStream(stream);
    }
    function isEnding(stream) {
      return !!stream._readableState && stream._readableState.ending;
    }
    function isEnded(stream) {
      return !!stream._readableState && stream._readableState.ended;
    }
    function isFinishing(stream) {
      return !!stream._writableState && stream._writableState.ending;
    }
    function isFinished(stream) {
      return !!stream._writableState && stream._writableState.ended;
    }
    function getStreamError(stream, opts = {}) {
      const err = stream._readableState && stream._readableState.error || stream._writableState && stream._writableState.error;
      return !opts.all && StreamError.isStreamDestroyed(err) ? null : err;
    }
    function isReadStreamx(stream) {
      return isStreamx(stream) && stream.readable;
    }
    function isDisturbed(stream) {
      return (stream._duplexState & OPENING) !== OPENING || (stream._duplexState & DESTROYING) === DESTROYING || (stream._duplexState & ACTIVE_OR_TICKING) !== 0;
    }
    function isTypedArray(data) {
      return typeof data === "object" && data !== null && typeof data.byteLength === "number";
    }
    function defaultByteLength(data) {
      return isTypedArray(data) ? data.byteLength : 1024;
    }
    function noop() {
    }
    function abort() {
      this.destroy(StreamError.ABORTED());
    }
    function isWritev(s) {
      return s._writev !== Writable.prototype._writev && s._writev !== Duplex.prototype._writev;
    }
    module2.exports = {
      pipeline: pipeline2,
      pipelinePromise,
      isStream,
      isStreamx,
      isEnding,
      isEnded,
      isFinishing,
      isFinished,
      isDisturbed,
      getStreamError,
      Stream,
      Writable,
      Readable: Readable2,
      Duplex,
      Transform,
      // Export PassThrough for compatibility with Node.js core's stream module
      PassThrough
    };
  }
});

// node_modules/tar-stream/headers.js
var require_headers = __commonJS({
  "node_modules/tar-stream/headers.js"(exports2) {
    var b4a = require_b4a();
    var ZEROS = "0000000000000000000";
    var SEVENS = "7777777777777777777";
    var ZERO_OFFSET = "0".charCodeAt(0);
    var USTAR_MAGIC = b4a.from([117, 115, 116, 97, 114, 0]);
    var USTAR_VER = b4a.from([ZERO_OFFSET, ZERO_OFFSET]);
    var GNU_MAGIC = b4a.from([117, 115, 116, 97, 114, 32]);
    var GNU_VER = b4a.from([32, 0]);
    var MASK = 4095;
    var MAGIC_OFFSET = 257;
    var VERSION_OFFSET = 263;
    exports2.decodeLongPath = function decodeLongPath(buf, encoding) {
      return decodeStr(buf, 0, buf.length, encoding);
    };
    exports2.encodePax = function encodePax(opts) {
      let result = "";
      if (opts.name) result += addLength(" path=" + opts.name + "\n");
      if (opts.linkname) result += addLength(" linkpath=" + opts.linkname + "\n");
      const pax = opts.pax;
      if (pax) {
        for (const key in pax) {
          result += addLength(" " + key + "=" + pax[key] + "\n");
        }
      }
      return b4a.from(result);
    };
    exports2.decodePax = function decodePax(buf) {
      const result = {};
      while (buf.length) {
        let i = 0;
        while (i < buf.length && buf[i] !== 32) i++;
        const len = parseInt(b4a.toString(buf.subarray(0, i)), 10);
        if (!len) return result;
        const b = b4a.toString(buf.subarray(i + 1, len - 1));
        const keyIndex = b.indexOf("=");
        if (keyIndex === -1) return result;
        result[b.slice(0, keyIndex)] = b.slice(keyIndex + 1);
        buf = buf.subarray(len);
      }
      return result;
    };
    exports2.encode = function encode(opts) {
      const buf = b4a.alloc(512);
      let name = opts.name;
      let prefix = "";
      if (opts.typeflag === 5 && name[name.length - 1] !== "/") name += "/";
      if (b4a.byteLength(name) !== name.length) return null;
      while (b4a.byteLength(name) > 100) {
        const i = name.indexOf("/");
        if (i === -1) return null;
        prefix += prefix ? "/" + name.slice(0, i) : name.slice(0, i);
        name = name.slice(i + 1);
      }
      if (b4a.byteLength(name) > 100 || b4a.byteLength(prefix) > 155) return null;
      if (opts.linkname && b4a.byteLength(opts.linkname) > 100) return null;
      b4a.write(buf, name);
      b4a.write(buf, encodeOct(opts.mode & MASK, 6), 100);
      b4a.write(buf, encodeOct(opts.uid, 6), 108);
      b4a.write(buf, encodeOct(opts.gid, 6), 116);
      encodeSize(opts.size, buf, 124);
      b4a.write(buf, encodeOct(opts.mtime.getTime() / 1e3 | 0, 11), 136);
      buf[156] = ZERO_OFFSET + toTypeflag(opts.type);
      if (opts.linkname) b4a.write(buf, opts.linkname, 157);
      b4a.copy(USTAR_MAGIC, buf, MAGIC_OFFSET);
      b4a.copy(USTAR_VER, buf, VERSION_OFFSET);
      if (opts.uname) b4a.write(buf, opts.uname, 265);
      if (opts.gname) b4a.write(buf, opts.gname, 297);
      b4a.write(buf, encodeOct(opts.devmajor || 0, 6), 329);
      b4a.write(buf, encodeOct(opts.devminor || 0, 6), 337);
      if (prefix) b4a.write(buf, prefix, 345);
      b4a.write(buf, encodeOct(cksum(buf), 6), 148);
      return buf;
    };
    exports2.decode = function decode(buf, filenameEncoding, allowUnknownFormat) {
      let typeflag = buf[156] === 0 ? 0 : buf[156] - ZERO_OFFSET;
      let name = decodeStr(buf, 0, 100, filenameEncoding);
      const mode = decodeOct(buf, 100, 8);
      const uid = decodeOct(buf, 108, 8);
      const gid = decodeOct(buf, 116, 8);
      const size = decodeOct(buf, 124, 12);
      const mtime = decodeOct(buf, 136, 12);
      const type2 = toType(typeflag);
      const linkname = buf[157] === 0 ? null : decodeStr(buf, 157, 100, filenameEncoding);
      const uname = decodeStr(buf, 265, 32);
      const gname = decodeStr(buf, 297, 32);
      const devmajor = decodeOct(buf, 329, 8);
      const devminor = decodeOct(buf, 337, 8);
      const c = cksum(buf);
      if (c === 8 * 32) return null;
      if (c !== decodeOct(buf, 148, 8)) throw new Error("Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?");
      if (isUSTAR(buf)) {
        if (buf[345]) name = decodeStr(buf, 345, 155, filenameEncoding) + "/" + name;
      } else if (isGNU(buf)) {
      } else {
        if (!allowUnknownFormat) {
          throw new Error("Invalid tar header: unknown format.");
        }
      }
      if (typeflag === 0 && name && name[name.length - 1] === "/") typeflag = 5;
      return {
        name,
        mode,
        uid,
        gid,
        size,
        byteOffset: 0,
        mtime: new Date(1e3 * mtime),
        type: type2,
        linkname,
        uname,
        gname,
        devmajor,
        devminor,
        pax: null
      };
    };
    function isUSTAR(buf) {
      return b4a.equals(USTAR_MAGIC, buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + 6));
    }
    function isGNU(buf) {
      return b4a.equals(GNU_MAGIC, buf.subarray(MAGIC_OFFSET, MAGIC_OFFSET + 6)) && b4a.equals(GNU_VER, buf.subarray(VERSION_OFFSET, VERSION_OFFSET + 2));
    }
    function clamp(index, len, defaultValue) {
      if (typeof index !== "number") return defaultValue;
      index = ~~index;
      if (index >= len) return len;
      if (index >= 0) return index;
      index += len;
      if (index >= 0) return index;
      return 0;
    }
    function toType(flag) {
      switch (flag) {
        case 0:
          return "file";
        case 1:
          return "link";
        case 2:
          return "symlink";
        case 3:
          return "character-device";
        case 4:
          return "block-device";
        case 5:
          return "directory";
        case 6:
          return "fifo";
        case 7:
          return "contiguous-file";
        case 72:
          return "pax-header";
        case 55:
          return "pax-global-header";
        case 27:
          return "gnu-long-link-path";
        case 28:
        case 30:
          return "gnu-long-path";
      }
      return null;
    }
    function toTypeflag(flag) {
      switch (flag) {
        case "file":
          return 0;
        case "link":
          return 1;
        case "symlink":
          return 2;
        case "character-device":
          return 3;
        case "block-device":
          return 4;
        case "directory":
          return 5;
        case "fifo":
          return 6;
        case "contiguous-file":
          return 7;
        case "pax-header":
          return 72;
      }
      return 0;
    }
    function indexOf(block, num2, offset, end) {
      for (; offset < end; offset++) {
        if (block[offset] === num2) return offset;
      }
      return end;
    }
    function cksum(block) {
      let sum = 8 * 32;
      for (let i = 0; i < 148; i++) sum += block[i];
      for (let j = 156; j < 512; j++) sum += block[j];
      return sum;
    }
    function encodeOct(val, n) {
      val = val.toString(8);
      if (val.length > n) return SEVENS.slice(0, n) + " ";
      return ZEROS.slice(0, n - val.length) + val + " ";
    }
    function encodeSizeBin(num2, buf, off) {
      buf[off] = 128;
      for (let i = 11; i > 0; i--) {
        buf[off + i] = num2 & 255;
        num2 = Math.floor(num2 / 256);
      }
    }
    function encodeSize(num2, buf, off) {
      if (num2.toString(8).length > 11) {
        encodeSizeBin(num2, buf, off);
      } else {
        b4a.write(buf, encodeOct(num2, 11), off);
      }
    }
    function parse256(buf) {
      let positive;
      if (buf[0] === 128) positive = true;
      else if (buf[0] === 255) positive = false;
      else return null;
      const tuple = [];
      let i;
      for (i = buf.length - 1; i > 0; i--) {
        const byte = buf[i];
        if (positive) tuple.push(byte);
        else tuple.push(255 - byte);
      }
      let sum = 0;
      const l = tuple.length;
      for (i = 0; i < l; i++) {
        sum += tuple[i] * Math.pow(256, i);
      }
      return positive ? sum : -1 * sum;
    }
    function decodeOct(val, offset, length) {
      val = val.subarray(offset, offset + length);
      offset = 0;
      if (val[offset] & 128) {
        return parse256(val);
      } else {
        while (offset < val.length && val[offset] === 32) offset++;
        const end = clamp(indexOf(val, 32, offset, val.length), val.length, val.length);
        while (offset < end && val[offset] === 0) offset++;
        if (end === offset) return 0;
        return parseInt(b4a.toString(val.subarray(offset, end)), 8);
      }
    }
    function decodeStr(val, offset, length, encoding) {
      return b4a.toString(val.subarray(offset, indexOf(val, 0, offset, offset + length)), encoding);
    }
    function addLength(str) {
      const len = b4a.byteLength(str);
      let digits = Math.floor(Math.log(len) / Math.log(10)) + 1;
      if (len + digits >= Math.pow(10, digits)) digits++;
      return len + digits + str;
    }
  }
});

// node_modules/tar-stream/extract.js
var require_extract = __commonJS({
  "node_modules/tar-stream/extract.js"(exports2, module2) {
    var { Writable, Readable: Readable2, getStreamError } = require_streamx();
    var FIFO = require_fast_fifo();
    var b4a = require_b4a();
    var headers = require_headers();
    var EMPTY = b4a.alloc(0);
    var MAX_HEADER_SIZE = 4 * 1024 * 1024;
    var BufferList = class {
      constructor() {
        this.buffered = 0;
        this.shifted = 0;
        this.queue = new FIFO();
        this._offset = 0;
      }
      push(buffer) {
        this.buffered += buffer.byteLength;
        this.queue.push(buffer);
      }
      shiftFirst(size) {
        return this.buffered === 0 ? null : this._next(size);
      }
      shift(size) {
        if (size > this.buffered) return null;
        if (size === 0) return EMPTY;
        let chunk = this._next(size);
        if (size === chunk.byteLength) return chunk;
        const chunks = [chunk];
        while ((size -= chunk.byteLength) > 0) {
          chunk = this._next(size);
          chunks.push(chunk);
        }
        return b4a.concat(chunks);
      }
      _next(size) {
        const buf = this.queue.peek();
        const rem = buf.byteLength - this._offset;
        if (size >= rem) {
          const sub = this._offset ? buf.subarray(this._offset, buf.byteLength) : buf;
          this.queue.shift();
          this._offset = 0;
          this.buffered -= rem;
          this.shifted += rem;
          return sub;
        }
        this.buffered -= size;
        this.shifted += size;
        return buf.subarray(this._offset, this._offset += size);
      }
    };
    var Source = class extends Readable2 {
      constructor(self, header, offset) {
        super();
        this.header = header;
        this.offset = offset;
        this._parent = self;
      }
      _read(cb) {
        if (this.header.size === 0) {
          this.push(null);
        }
        if (this._parent._stream === this) {
          this._parent._update();
        }
        cb(null);
      }
      _predestroy() {
        this._parent.destroy(getStreamError(this));
      }
      _detach() {
        if (this._parent._stream === this) {
          this._parent._stream = null;
          this._parent._missing = overflow(this.header.size);
          this._parent._update();
        }
      }
      _destroy(cb) {
        this._detach();
        cb(null);
      }
    };
    var Extract = class extends Writable {
      constructor(opts) {
        super(opts);
        if (!opts) opts = {};
        this._buffer = new BufferList();
        this._offset = 0;
        this._header = null;
        this._stream = null;
        this._missing = 0;
        this._longHeader = false;
        this._callback = noop;
        this._locked = false;
        this._finished = false;
        this._pax = null;
        this._paxGlobal = null;
        this._gnuLongPath = null;
        this._gnuLongLinkPath = null;
        this._filenameEncoding = opts.filenameEncoding || "utf-8";
        this._allowUnknownFormat = !!opts.allowUnknownFormat;
        this._unlockBound = this._unlock.bind(this);
      }
      _unlock(err) {
        this._locked = false;
        if (err) {
          this.destroy(err);
          this._continueWrite(err);
          return;
        }
        this._update();
      }
      _consumeHeader() {
        if (this._locked) return false;
        this._offset = this._buffer.shifted;
        try {
          this._header = headers.decode(this._buffer.shift(512), this._filenameEncoding, this._allowUnknownFormat);
        } catch (err) {
          this._continueWrite(err);
          return false;
        }
        if (!this._header) return true;
        this._header.byteOffset = this._buffer.shifted;
        switch (this._header.type) {
          case "gnu-long-path":
          case "gnu-long-link-path":
          case "pax-global-header":
          case "pax-header":
            this._longHeader = true;
            this._missing = this._header.size;
            if (this._missing > MAX_HEADER_SIZE) {
              this._continueWrite(new Error("Header exceeds max size"));
              return false;
            }
            return true;
        }
        this._locked = true;
        this._applyLongHeaders();
        if (!(this._header.size >= 0)) {
          this._continueWrite(new Error("Invalid header"));
          return false;
        }
        if (this._header.size === 0 || this._header.type === "directory") {
          this.emit("entry", this._header, this._createStream(), this._unlockBound);
          return true;
        }
        this._stream = this._createStream();
        this._missing = this._header.size;
        this.emit("entry", this._header, this._stream, this._unlockBound);
        return true;
      }
      _applyLongHeaders() {
        if (this._gnuLongPath) {
          this._header.name = this._gnuLongPath;
          this._gnuLongPath = null;
        }
        if (this._gnuLongLinkPath) {
          this._header.linkname = this._gnuLongLinkPath;
          this._gnuLongLinkPath = null;
        }
        if (this._pax) {
          if (this._pax.path) this._header.name = this._pax.path;
          if (this._pax.linkpath) this._header.linkname = this._pax.linkpath;
          if (this._pax.size) this._header.size = parseInt(this._pax.size, 10);
          this._header.pax = this._pax;
          this._pax = null;
        }
      }
      _decodeLongHeader(buf) {
        switch (this._header.type) {
          case "gnu-long-path":
            this._gnuLongPath = headers.decodeLongPath(buf, this._filenameEncoding);
            break;
          case "gnu-long-link-path":
            this._gnuLongLinkPath = headers.decodeLongPath(buf, this._filenameEncoding);
            break;
          case "pax-global-header":
            this._paxGlobal = headers.decodePax(buf);
            break;
          case "pax-header":
            this._pax = this._paxGlobal === null ? headers.decodePax(buf) : Object.assign({}, this._paxGlobal, headers.decodePax(buf));
            break;
        }
      }
      _consumeLongHeader() {
        this._longHeader = false;
        this._missing = overflow(this._header.size);
        const buf = this._buffer.shift(this._header.size);
        try {
          this._decodeLongHeader(buf);
        } catch (err) {
          this._continueWrite(err);
          return false;
        }
        return true;
      }
      _consumeStream() {
        const buf = this._buffer.shiftFirst(this._missing);
        if (buf === null) return false;
        this._missing -= buf.byteLength;
        const drained = this._stream.push(buf);
        if (this._missing === 0) {
          this._stream.push(null);
          if (drained) this._stream._detach();
          return drained && this._locked === false;
        }
        return drained;
      }
      _createStream() {
        return new Source(this, this._header, this._offset);
      }
      _update() {
        while (this._buffer.buffered > 0 && !this.destroying) {
          if (this._missing > 0) {
            if (this._stream !== null) {
              if (this._consumeStream() === false) return;
              continue;
            }
            if (this._longHeader === true) {
              if (this._missing > this._buffer.buffered) break;
              if (this._consumeLongHeader() === false) return false;
              continue;
            }
            const ignore2 = this._buffer.shiftFirst(this._missing);
            if (ignore2 !== null) this._missing -= ignore2.byteLength;
            continue;
          }
          if (this._buffer.buffered < 512) break;
          if (this._stream !== null || this._consumeHeader() === false) return;
        }
        this._continueWrite(null);
      }
      _continueWrite(err) {
        const cb = this._callback;
        this._callback = noop;
        cb(err);
      }
      _write(data, cb) {
        this._callback = cb;
        this._buffer.push(data);
        this._update();
      }
      _final(cb) {
        this._finished = this._missing === 0 && this._buffer.buffered === 0;
        cb(this._finished ? null : new Error("Unexpected end of data"));
      }
      _predestroy() {
        this._continueWrite(null);
      }
      _destroy(cb) {
        if (this._stream) this._stream.destroy(getStreamError(this));
        cb(null);
      }
      [Symbol.asyncIterator]() {
        let error = null;
        let promiseResolve = null;
        let promiseReject = null;
        let entryStream = null;
        let entryCallback = null;
        const extract2 = this;
        this.on("entry", onentry);
        this.on("error", (err) => {
          error = err;
        });
        this.on("close", onclose);
        return {
          [Symbol.asyncIterator]() {
            return this;
          },
          next() {
            return new Promise(onnext);
          },
          return() {
            return destroy(null);
          },
          throw(err) {
            return destroy(err);
          }
        };
        function consumeCallback(err) {
          if (!entryCallback) return;
          const cb = entryCallback;
          entryCallback = null;
          cb(err);
        }
        function onnext(resolve10, reject) {
          if (error) {
            return reject(error);
          }
          if (entryStream) {
            resolve10({ value: entryStream, done: false });
            entryStream = null;
            return;
          }
          promiseResolve = resolve10;
          promiseReject = reject;
          consumeCallback(null);
          if (extract2._finished && promiseResolve) {
            promiseResolve({ value: void 0, done: true });
            promiseResolve = promiseReject = null;
          }
        }
        function onentry(header, stream, callback) {
          entryCallback = callback;
          stream.on("error", noop);
          if (promiseResolve) {
            promiseResolve({ value: stream, done: false });
            promiseResolve = promiseReject = null;
          } else {
            entryStream = stream;
          }
        }
        function onclose() {
          consumeCallback(error);
          if (!promiseResolve) return;
          if (error) promiseReject(error);
          else promiseResolve({ value: void 0, done: true });
          promiseResolve = promiseReject = null;
        }
        function destroy(err) {
          extract2.destroy(err);
          consumeCallback(err);
          return new Promise((resolve10, reject) => {
            if (extract2.destroyed) return resolve10({ value: void 0, done: true });
            extract2.once("close", function() {
              if (err) reject(err);
              else resolve10({ value: void 0, done: true });
            });
          });
        }
      }
    };
    module2.exports = function extract2(opts) {
      return new Extract(opts);
    };
    function noop() {
    }
    function overflow(size) {
      size &= 511;
      return size && 512 - size;
    }
  }
});

// node_modules/tar-stream/constants.js
var require_constants = __commonJS({
  "node_modules/tar-stream/constants.js"(exports2, module2) {
    var constants = {
      // just for envs without fs
      S_IFMT: 61440,
      S_IFDIR: 16384,
      S_IFCHR: 8192,
      S_IFBLK: 24576,
      S_IFIFO: 4096,
      S_IFLNK: 40960
    };
    try {
      module2.exports = require("fs").constants || constants;
    } catch {
      module2.exports = constants;
    }
  }
});

// node_modules/tar-stream/pack.js
var require_pack = __commonJS({
  "node_modules/tar-stream/pack.js"(exports2, module2) {
    var { Readable: Readable2, Writable, getStreamError } = require_streamx();
    var b4a = require_b4a();
    var constants = require_constants();
    var headers = require_headers();
    var DMODE = 493;
    var FMODE = 420;
    var END_OF_TAR = b4a.alloc(1024);
    var Sink = class extends Writable {
      constructor(pack2, header, callback) {
        super({ mapWritable, eagerOpen: true });
        this.written = 0;
        this.header = header;
        this._callback = callback;
        this._linkname = null;
        this._isLinkname = header.type === "symlink" && !header.linkname;
        this._isVoid = header.type !== "file" && header.type !== "contiguous-file";
        this._finished = false;
        this._pack = pack2;
        this._openCallback = null;
        if (this._pack._stream === null) this._pack._stream = this;
        else this._pack._pending.push(this);
      }
      _open(cb) {
        this._openCallback = cb;
        if (this._pack._stream === this) this._continueOpen();
      }
      _continuePack(err) {
        if (this._callback === null) return;
        const callback = this._callback;
        this._callback = null;
        callback(err);
      }
      _continueOpen() {
        if (this._pack._stream === null) this._pack._stream = this;
        const cb = this._openCallback;
        this._openCallback = null;
        if (cb === null) return;
        if (this._pack.destroying) return cb(new Error("pack stream destroyed"));
        if (this._pack._finalized) return cb(new Error("pack stream is already finalized"));
        this._pack._stream = this;
        if (!this._isLinkname) {
          this._pack._encode(this.header);
        }
        if (this._isVoid) {
          this._finish();
          this._continuePack(null);
        }
        cb(null);
      }
      _write(data, cb) {
        if (this._isLinkname) {
          this._linkname = this._linkname ? b4a.concat([this._linkname, data]) : data;
          return cb(null);
        }
        if (this._isVoid) {
          if (data.byteLength > 0) {
            return cb(new Error("No body allowed for this entry"));
          }
          return cb();
        }
        this.written += data.byteLength;
        if (this._pack.push(data)) return cb();
        this._pack._drain = cb;
      }
      _finish() {
        if (this._finished) return;
        this._finished = true;
        if (this._isLinkname) {
          this.header.linkname = this._linkname ? b4a.toString(this._linkname, "utf-8") : "";
          this._pack._encode(this.header);
        }
        overflow(this._pack, this.header.size);
        this._pack._done(this);
      }
      _final(cb) {
        if (this.written !== this.header.size) {
          return cb(new Error("Size mismatch"));
        }
        this._finish();
        cb(null);
      }
      _getError() {
        return getStreamError(this) || new Error("tar entry destroyed");
      }
      _predestroy() {
        this._pack.destroy(this._getError());
      }
      _destroy(cb) {
        this._pack._done(this);
        this._continuePack(this._finished ? null : this._getError());
        cb();
      }
    };
    var Pack = class extends Readable2 {
      constructor(opts) {
        super(opts);
        this._drain = noop;
        this._finalized = false;
        this._finalizing = false;
        this._pending = [];
        this._stream = null;
      }
      entry(header, buffer, callback) {
        if (this._finalized || this.destroying) throw new Error("already finalized or destroyed");
        if (typeof buffer === "function") {
          callback = buffer;
          buffer = null;
        }
        if (!callback) callback = noop;
        if (!header.size || header.type === "symlink") header.size = 0;
        if (!header.type) header.type = modeToType(header.mode);
        if (!header.mode) header.mode = header.type === "directory" ? DMODE : FMODE;
        if (!header.uid) header.uid = 0;
        if (!header.gid) header.gid = 0;
        if (!header.mtime) header.mtime = /* @__PURE__ */ new Date();
        if (typeof buffer === "string") buffer = b4a.from(buffer);
        const sink = new Sink(this, header, callback);
        if (b4a.isBuffer(buffer)) {
          header.size = buffer.byteLength;
          sink.write(buffer);
          sink.end();
          return sink;
        }
        if (sink._isVoid) {
          return sink;
        }
        return sink;
      }
      finalize() {
        if (this._stream || this._pending.length > 0) {
          this._finalizing = true;
          return;
        }
        if (this._finalized) return;
        this._finalized = true;
        this.push(END_OF_TAR);
        this.push(null);
      }
      _done(stream) {
        if (stream !== this._stream) return;
        this._stream = null;
        if (this._finalizing) this.finalize();
        if (this._pending.length) this._pending.shift()._continueOpen();
      }
      _encode(header) {
        if (!header.pax) {
          const buf = headers.encode(header);
          if (buf) {
            this.push(buf);
            return;
          }
        }
        this._encodePax(header);
      }
      _encodePax(header) {
        const paxHeader = headers.encodePax({
          name: header.name,
          linkname: header.linkname,
          pax: header.pax
        });
        const newHeader = {
          name: "PaxHeader",
          mode: header.mode,
          uid: header.uid,
          gid: header.gid,
          size: paxHeader.byteLength,
          mtime: header.mtime,
          type: "pax-header",
          linkname: header.linkname && "PaxHeader",
          uname: header.uname,
          gname: header.gname,
          devmajor: header.devmajor,
          devminor: header.devminor
        };
        this.push(headers.encode(newHeader));
        this.push(paxHeader);
        overflow(this, paxHeader.byteLength);
        newHeader.size = header.size;
        newHeader.type = header.type;
        this.push(headers.encode(newHeader));
      }
      _doDrain() {
        const drain = this._drain;
        this._drain = noop;
        drain();
      }
      _predestroy() {
        const err = getStreamError(this);
        if (this._stream) this._stream.destroy(err);
        while (this._pending.length) {
          const stream = this._pending.shift();
          stream.destroy(err);
          stream._continueOpen();
        }
        this._doDrain();
      }
      _read(cb) {
        this._doDrain();
        cb();
      }
    };
    module2.exports = function pack2(opts) {
      return new Pack(opts);
    };
    function modeToType(mode) {
      switch (mode & constants.S_IFMT) {
        case constants.S_IFBLK:
          return "block-device";
        case constants.S_IFCHR:
          return "character-device";
        case constants.S_IFDIR:
          return "directory";
        case constants.S_IFIFO:
          return "fifo";
        case constants.S_IFLNK:
          return "symlink";
      }
      return "file";
    }
    function noop() {
    }
    function overflow(self, size) {
      size &= 511;
      if (size) self.push(END_OF_TAR.subarray(0, 512 - size));
    }
    function mapWritable(buf) {
      return b4a.isBuffer(buf) ? buf : b4a.from(buf);
    }
  }
});

// node_modules/tar-stream/index.js
var require_tar_stream = __commonJS({
  "node_modules/tar-stream/index.js"(exports2) {
    exports2.extract = require_extract();
    exports2.pack = require_pack();
  }
});

// node_modules/picomatch/lib/constants.js
var require_constants2 = __commonJS({
  "node_modules/picomatch/lib/constants.js"(exports2, module2) {
    "use strict";
    var WIN_SLASH = "\\\\/";
    var WIN_NO_SLASH = `[^${WIN_SLASH}]`;
    var DEFAULT_MAX_EXTGLOB_RECURSION = 0;
    var DOT_LITERAL = "\\.";
    var PLUS_LITERAL = "\\+";
    var QMARK_LITERAL = "\\?";
    var SLASH_LITERAL = "\\/";
    var ONE_CHAR = "(?=.)";
    var QMARK = "[^/]";
    var END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
    var START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
    var DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
    var NO_DOT = `(?!${DOT_LITERAL})`;
    var NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
    var NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
    var NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
    var QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
    var STAR = `${QMARK}*?`;
    var SEP = "/";
    var POSIX_CHARS = {
      DOT_LITERAL,
      PLUS_LITERAL,
      QMARK_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      QMARK,
      END_ANCHOR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR,
      SEP
    };
    var WINDOWS_CHARS = {
      ...POSIX_CHARS,
      SLASH_LITERAL: `[${WIN_SLASH}]`,
      QMARK: WIN_NO_SLASH,
      STAR: `${WIN_NO_SLASH}*?`,
      DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
      NO_DOT: `(?!${DOT_LITERAL})`,
      NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
      NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
      START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
      END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
      SEP: "\\"
    };
    var POSIX_REGEX_SOURCE = {
      __proto__: null,
      alnum: "a-zA-Z0-9",
      alpha: "a-zA-Z",
      ascii: "\\x00-\\x7F",
      blank: " \\t",
      cntrl: "\\x00-\\x1F\\x7F",
      digit: "0-9",
      graph: "\\x21-\\x7E",
      lower: "a-z",
      print: "\\x20-\\x7E ",
      punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
      space: " \\t\\r\\n\\v\\f",
      upper: "A-Z",
      word: "A-Za-z0-9_",
      xdigit: "A-Fa-f0-9"
    };
    module2.exports = {
      DEFAULT_MAX_EXTGLOB_RECURSION,
      MAX_LENGTH: 1024 * 64,
      POSIX_REGEX_SOURCE,
      // regular expressions
      REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
      REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
      REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
      REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
      REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
      REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
      // Replace globs with equivalent patterns to reduce parsing time.
      REPLACEMENTS: {
        __proto__: null,
        "***": "*",
        "**/**": "**",
        "**/**/**": "**"
      },
      // Digits
      CHAR_0: 48,
      /* 0 */
      CHAR_9: 57,
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: 65,
      /* A */
      CHAR_LOWERCASE_A: 97,
      /* a */
      CHAR_UPPERCASE_Z: 90,
      /* Z */
      CHAR_LOWERCASE_Z: 122,
      /* z */
      CHAR_LEFT_PARENTHESES: 40,
      /* ( */
      CHAR_RIGHT_PARENTHESES: 41,
      /* ) */
      CHAR_ASTERISK: 42,
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: 38,
      /* & */
      CHAR_AT: 64,
      /* @ */
      CHAR_BACKWARD_SLASH: 92,
      /* \ */
      CHAR_CARRIAGE_RETURN: 13,
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: 94,
      /* ^ */
      CHAR_COLON: 58,
      /* : */
      CHAR_COMMA: 44,
      /* , */
      CHAR_DOT: 46,
      /* . */
      CHAR_DOUBLE_QUOTE: 34,
      /* " */
      CHAR_EQUAL: 61,
      /* = */
      CHAR_EXCLAMATION_MARK: 33,
      /* ! */
      CHAR_FORM_FEED: 12,
      /* \f */
      CHAR_FORWARD_SLASH: 47,
      /* / */
      CHAR_GRAVE_ACCENT: 96,
      /* ` */
      CHAR_HASH: 35,
      /* # */
      CHAR_HYPHEN_MINUS: 45,
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: 60,
      /* < */
      CHAR_LEFT_CURLY_BRACE: 123,
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: 91,
      /* [ */
      CHAR_LINE_FEED: 10,
      /* \n */
      CHAR_NO_BREAK_SPACE: 160,
      /* \u00A0 */
      CHAR_PERCENT: 37,
      /* % */
      CHAR_PLUS: 43,
      /* + */
      CHAR_QUESTION_MARK: 63,
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: 62,
      /* > */
      CHAR_RIGHT_CURLY_BRACE: 125,
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: 93,
      /* ] */
      CHAR_SEMICOLON: 59,
      /* ; */
      CHAR_SINGLE_QUOTE: 39,
      /* ' */
      CHAR_SPACE: 32,
      /*   */
      CHAR_TAB: 9,
      /* \t */
      CHAR_UNDERSCORE: 95,
      /* _ */
      CHAR_VERTICAL_LINE: 124,
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
      /* \uFEFF */
      /**
       * Create EXTGLOB_CHARS
       */
      extglobChars(chars) {
        return {
          "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
          "?": { type: "qmark", open: "(?:", close: ")?" },
          "+": { type: "plus", open: "(?:", close: ")+" },
          "*": { type: "star", open: "(?:", close: ")*" },
          "@": { type: "at", open: "(?:", close: ")" }
        };
      },
      /**
       * Create GLOB_CHARS
       */
      globChars(win32) {
        return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
      }
    };
  }
});

// node_modules/picomatch/lib/utils.js
var require_utils = __commonJS({
  "node_modules/picomatch/lib/utils.js"(exports2) {
    "use strict";
    var {
      REGEX_BACKSLASH,
      REGEX_REMOVE_BACKSLASH,
      REGEX_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_GLOBAL
    } = require_constants2();
    exports2.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    exports2.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
    exports2.isRegexChar = (str) => str.length === 1 && exports2.hasRegexChars(str);
    exports2.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
    exports2.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
    exports2.isWindows = () => {
      if (typeof navigator !== "undefined" && navigator.platform) {
        const platform = navigator.platform.toLowerCase();
        return platform === "win32" || platform === "windows";
      }
      if (typeof process !== "undefined" && process.platform) {
        return process.platform === "win32";
      }
      return false;
    };
    exports2.removeBackslashes = (str) => {
      return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
        return match === "\\" ? "" : match;
      });
    };
    exports2.escapeLast = (input, char, lastIdx) => {
      const idx = input.lastIndexOf(char, lastIdx);
      if (idx === -1) return input;
      if (input[idx - 1] === "\\") return exports2.escapeLast(input, char, idx - 1);
      return `${input.slice(0, idx)}\\${input.slice(idx)}`;
    };
    exports2.removePrefix = (input, state = {}) => {
      let output = input;
      if (output.startsWith("./")) {
        output = output.slice(2);
        state.prefix = "./";
      }
      return output;
    };
    exports2.wrapOutput = (input, state = {}, options = {}) => {
      const prepend = options.contains ? "" : "^";
      const append = options.contains ? "" : "$";
      let output = `${prepend}(?:${input})${append}`;
      if (state.negated === true) {
        output = `(?:^(?!${output}).*$)`;
      }
      return output;
    };
    exports2.basename = (path19, { windows } = {}) => {
      const segs = path19.split(windows ? /[\\/]/ : "/");
      const last = segs[segs.length - 1];
      if (last === "") {
        return segs[segs.length - 2];
      }
      return last;
    };
  }
});

// node_modules/picomatch/lib/scan.js
var require_scan = __commonJS({
  "node_modules/picomatch/lib/scan.js"(exports2, module2) {
    "use strict";
    var utils = require_utils();
    var {
      CHAR_ASTERISK,
      /* * */
      CHAR_AT,
      /* @ */
      CHAR_BACKWARD_SLASH,
      /* \ */
      CHAR_COMMA,
      /* , */
      CHAR_DOT,
      /* . */
      CHAR_EXCLAMATION_MARK,
      /* ! */
      CHAR_FORWARD_SLASH,
      /* / */
      CHAR_LEFT_CURLY_BRACE,
      /* { */
      CHAR_LEFT_PARENTHESES,
      /* ( */
      CHAR_LEFT_SQUARE_BRACKET,
      /* [ */
      CHAR_PLUS,
      /* + */
      CHAR_QUESTION_MARK,
      /* ? */
      CHAR_RIGHT_CURLY_BRACE,
      /* } */
      CHAR_RIGHT_PARENTHESES,
      /* ) */
      CHAR_RIGHT_SQUARE_BRACKET
      /* ] */
    } = require_constants2();
    var isPathSeparator = (code) => {
      return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
    };
    var depth = (token) => {
      if (token.isPrefix !== true) {
        token.depth = token.isGlobstar ? Infinity : 1;
      }
    };
    var scan = (input, options) => {
      const opts = options || {};
      const length = input.length - 1;
      const scanToEnd = opts.parts === true || opts.tokens === true || opts.scanToEnd === true;
      const slashes = [];
      const tokens = [];
      const parts = [];
      let str = input;
      let index = -1;
      let start = 0;
      let lastIndex = 0;
      let isBrace = false;
      let isBracket = false;
      let isGlob = false;
      let isExtglob = false;
      let isGlobstar = false;
      let braceEscaped = false;
      let backslashes = false;
      let negated = false;
      let negatedExtglob = false;
      let finished = false;
      let braces = 0;
      let prev;
      let code;
      let token = { value: "", depth: 0, isGlob: false };
      const eos = () => index >= length;
      const peek = () => str.charCodeAt(index + 1);
      const advance = () => {
        prev = code;
        return str.charCodeAt(++index);
      };
      while (index < length) {
        code = advance();
        let next;
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          code = advance();
          if (code === CHAR_LEFT_CURLY_BRACE) {
            braceEscaped = true;
          }
          continue;
        }
        if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              advance();
              continue;
            }
            if (code === CHAR_LEFT_CURLY_BRACE) {
              braces++;
              continue;
            }
            if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
              isBrace = token.isBrace = true;
              isGlob = token.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (braceEscaped !== true && code === CHAR_COMMA) {
              isBrace = token.isBrace = true;
              isGlob = token.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (code === CHAR_RIGHT_CURLY_BRACE) {
              braces--;
              if (braces === 0) {
                braceEscaped = false;
                isBrace = token.isBrace = true;
                finished = true;
                break;
              }
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_FORWARD_SLASH) {
          slashes.push(index);
          tokens.push(token);
          token = { value: "", depth: 0, isGlob: false };
          if (finished === true) continue;
          if (prev === CHAR_DOT && index === start + 1) {
            start += 2;
            continue;
          }
          lastIndex = index + 1;
          continue;
        }
        if (opts.noext !== true) {
          const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
          if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
            isGlob = token.isGlob = true;
            isExtglob = token.isExtglob = true;
            finished = true;
            if (code === CHAR_EXCLAMATION_MARK && index === start) {
              negatedExtglob = true;
            }
            if (scanToEnd === true) {
              let parens = 0;
              while (eos() !== true && (code = advance())) {
                if (code === CHAR_BACKWARD_SLASH) {
                  backslashes = token.backslashes = true;
                  advance();
                  continue;
                }
                if (code === CHAR_LEFT_PARENTHESES) {
                  parens++;
                  continue;
                }
                if (code === CHAR_RIGHT_PARENTHESES && --parens === 0) {
                  finished = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
        }
        if (code === CHAR_ASTERISK) {
          if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_QUESTION_MARK) {
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_LEFT_SQUARE_BRACKET) {
          while (eos() !== true && (next = advance())) {
            if (next === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              isBracket = token.isBracket = true;
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
          negated = token.negated = true;
          start++;
          continue;
        }
        if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
          isGlob = token.isGlob = true;
          if (scanToEnd === true) {
            let parens = 1;
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_BACKWARD_SLASH) {
                backslashes = token.backslashes = true;
                advance();
                continue;
              }
              if (code === CHAR_LEFT_PARENTHESES) {
                parens++;
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES && --parens === 0) {
                finished = true;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (isGlob === true) {
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
      }
      if (opts.noext === true) {
        isExtglob = false;
        isGlob = false;
      }
      let base = str;
      let prefix = "";
      let glob = "";
      if (start > 0) {
        prefix = str.slice(0, start);
        str = str.slice(start);
        lastIndex -= start;
      }
      if (base && isGlob === true && lastIndex > 0) {
        base = str.slice(0, lastIndex);
        glob = str.slice(lastIndex);
      } else if (isGlob === true) {
        base = "";
        glob = str;
      } else {
        base = str;
      }
      if (base && base !== "" && base !== "/" && base !== str) {
        if (isPathSeparator(base.charCodeAt(base.length - 1))) {
          base = base.slice(0, -1);
        }
      }
      if (opts.unescape === true) {
        if (glob) glob = utils.removeBackslashes(glob);
        if (base && backslashes === true) {
          base = utils.removeBackslashes(base);
        }
      }
      const state = {
        prefix,
        input,
        start,
        base,
        glob,
        isBrace,
        isBracket,
        isGlob,
        isExtglob,
        isGlobstar,
        negated,
        negatedExtglob
      };
      if (opts.tokens === true) {
        state.maxDepth = 0;
        if (!isPathSeparator(code)) {
          tokens.push(token);
        }
        state.tokens = tokens;
      }
      if (opts.parts === true || opts.tokens === true) {
        let prevIndex;
        for (let idx = 0; idx < slashes.length; idx++) {
          const n2 = prevIndex !== void 0 ? prevIndex + 1 : start;
          const i = slashes[idx];
          const value2 = input.slice(n2, i);
          if (opts.tokens) {
            if (idx === 0 && start !== 0) {
              tokens[idx].isPrefix = true;
              tokens[idx].value = prefix;
            } else {
              tokens[idx].value = value2;
            }
            depth(tokens[idx]);
            state.maxDepth += tokens[idx].depth;
          }
          if (i >= start) {
            parts.push(value2);
            prevIndex = i;
          }
        }
        const n = prevIndex !== void 0 ? prevIndex + 1 : start;
        const value = input.slice(n);
        parts.push(value);
        if (opts.tokens && prevIndex && prevIndex + 1 < input.length) {
          tokens[tokens.length - 1].value = value;
          depth(tokens[tokens.length - 1]);
          state.maxDepth += tokens[tokens.length - 1].depth;
        }
        state.slashes = slashes;
        state.parts = parts;
      }
      return state;
    };
    module2.exports = scan;
  }
});

// node_modules/picomatch/lib/parse.js
var require_parse = __commonJS({
  "node_modules/picomatch/lib/parse.js"(exports2, module2) {
    "use strict";
    var constants = require_constants2();
    var utils = require_utils();
    var {
      MAX_LENGTH,
      POSIX_REGEX_SOURCE,
      REGEX_NON_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_BACKREF,
      REPLACEMENTS
    } = constants;
    var expandRange = (args, options) => {
      if (typeof options.expandRange === "function") {
        return options.expandRange(...args, options);
      }
      args.sort();
      const value = `[${args.join("-")}]`;
      try {
        new RegExp(value);
      } catch (ex) {
        return args.map((v) => utils.escapeRegex(v)).join("..");
      }
      return value;
    };
    var syntaxError = (type2, char) => {
      return `Missing ${type2}: "${char}" - use "\\\\${char}" to match literal characters`;
    };
    var splitTopLevel = (input) => {
      const parts = [];
      let bracket = 0;
      let paren = 0;
      let quote = 0;
      let value = "";
      let escaped = false;
      for (const ch of input) {
        if (escaped === true) {
          value += ch;
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          value += ch;
          escaped = true;
          continue;
        }
        if (ch === '"') {
          quote = quote === 1 ? 0 : 1;
          value += ch;
          continue;
        }
        if (quote === 0) {
          if (ch === "[") {
            bracket++;
          } else if (ch === "]" && bracket > 0) {
            bracket--;
          } else if (bracket === 0) {
            if (ch === "(") {
              paren++;
            } else if (ch === ")" && paren > 0) {
              paren--;
            } else if (ch === "|" && paren === 0) {
              parts.push(value);
              value = "";
              continue;
            }
          }
        }
        value += ch;
      }
      parts.push(value);
      return parts;
    };
    var isPlainBranch = (branch) => {
      let escaped = false;
      for (const ch of branch) {
        if (escaped === true) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (/[?*+@!()[\]{}]/.test(ch)) {
          return false;
        }
      }
      return true;
    };
    var normalizeSimpleBranch = (branch) => {
      let value = branch.trim();
      let changed = true;
      while (changed === true) {
        changed = false;
        if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
          value = value.slice(2, -1);
          changed = true;
        }
      }
      if (!isPlainBranch(value)) {
        return;
      }
      return value.replace(/\\(.)/g, "$1");
    };
    var hasRepeatedCharPrefixOverlap = (branches) => {
      const values = branches.map(normalizeSimpleBranch).filter(Boolean);
      for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
          const a = values[i];
          const b = values[j];
          const char = a[0];
          if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) {
            continue;
          }
          if (a === b || a.startsWith(b) || b.startsWith(a)) {
            return true;
          }
        }
      }
      return false;
    };
    var parseRepeatedExtglob = (pattern, requireEnd = true) => {
      if (pattern[0] !== "+" && pattern[0] !== "*" || pattern[1] !== "(") {
        return;
      }
      let bracket = 0;
      let paren = 0;
      let quote = 0;
      let escaped = false;
      for (let i = 1; i < pattern.length; i++) {
        const ch = pattern[i];
        if (escaped === true) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          quote = quote === 1 ? 0 : 1;
          continue;
        }
        if (quote === 1) {
          continue;
        }
        if (ch === "[") {
          bracket++;
          continue;
        }
        if (ch === "]" && bracket > 0) {
          bracket--;
          continue;
        }
        if (bracket > 0) {
          continue;
        }
        if (ch === "(") {
          paren++;
          continue;
        }
        if (ch === ")") {
          paren--;
          if (paren === 0) {
            if (requireEnd === true && i !== pattern.length - 1) {
              return;
            }
            return {
              type: pattern[0],
              body: pattern.slice(2, i),
              end: i
            };
          }
        }
      }
    };
    var buildCharClassStar = (chars) => {
      const source = chars.length === 1 ? utils.escapeRegex(chars[0]) : `[${chars.map((ch) => utils.escapeRegex(ch)).join("")}]`;
      return `${source}*`;
    };
    var getStarExtglobSequenceChars = (pattern) => {
      let index = 0;
      const chars = [];
      while (index < pattern.length) {
        const match = parseRepeatedExtglob(pattern.slice(index), false);
        if (!match || match.type !== "*") {
          return;
        }
        const branches = splitTopLevel(match.body).map((branch2) => branch2.trim());
        if (branches.length !== 1) {
          return;
        }
        const branch = normalizeSimpleBranch(branches[0]);
        if (!branch || branch.length !== 1) {
          return;
        }
        chars.push(branch);
        index += match.end + 1;
      }
      if (chars.length < 1) {
        return;
      }
      return chars;
    };
    var repeatedExtglobRecursion = (pattern) => {
      let depth = 0;
      let value = pattern.trim();
      let match = parseRepeatedExtglob(value);
      while (match) {
        depth++;
        value = match.body.trim();
        match = parseRepeatedExtglob(value);
      }
      return depth;
    };
    var analyzeRepeatedExtglob = (body, options) => {
      if (options.maxExtglobRecursion === false) {
        return { risky: false };
      }
      const max = typeof options.maxExtglobRecursion === "number" ? options.maxExtglobRecursion : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
      const branches = splitTopLevel(body).map((branch) => branch.trim());
      if (branches.length > 1) {
        if (branches.some((branch) => branch === "") || branches.some((branch) => /^[*?]+$/.test(branch)) || hasRepeatedCharPrefixOverlap(branches)) {
          return { risky: true };
        }
      }
      const safeChars = [];
      let sawStarSequence = false;
      let combinable = true;
      for (const branch of branches) {
        const chars = getStarExtglobSequenceChars(branch);
        if (chars) {
          sawStarSequence = true;
          safeChars.push(...chars);
          continue;
        }
        const literal = normalizeSimpleBranch(branch);
        if (literal && literal.length === 1) {
          safeChars.push(literal);
          continue;
        }
        combinable = false;
        if (repeatedExtglobRecursion(branch) > max) {
          return { risky: true };
        }
      }
      if (sawStarSequence) {
        return combinable ? { risky: true, safeOutput: buildCharClassStar([...new Set(safeChars)]) } : { risky: true };
      }
      return { risky: false };
    };
    var parse2 = (input, options) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected a string");
      }
      input = REPLACEMENTS[input] || input;
      const opts = { ...options };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      let len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      const bos = { type: "bos", value: "", output: opts.prepend || "" };
      const tokens = [bos];
      const capture = opts.capture ? "" : "?:";
      const PLATFORM_CHARS = constants.globChars(opts.windows);
      const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
      const {
        DOT_LITERAL,
        PLUS_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOT_SLASH,
        NO_DOTS_SLASH,
        QMARK,
        QMARK_NO_DOT,
        STAR,
        START_ANCHOR
      } = PLATFORM_CHARS;
      const globstar = (opts2) => {
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const nodot = opts.dot ? "" : NO_DOT;
      const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
      let star = opts.bash === true ? globstar(opts) : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      if (typeof opts.noext === "boolean") {
        opts.noextglob = opts.noext;
      }
      const state = {
        input,
        index: -1,
        start: 0,
        dot: opts.dot === true,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: false,
        negated: false,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: false,
        tokens
      };
      input = utils.removePrefix(input, state);
      len = input.length;
      const extglobs = [];
      const braces = [];
      const stack = [];
      let prev = bos;
      let value;
      const eos = () => state.index === len - 1;
      const peek = state.peek = (n = 1) => input[state.index + n];
      const advance = state.advance = () => input[++state.index] || "";
      const remaining = () => input.slice(state.index + 1);
      const consume = (value2 = "", num2 = 0) => {
        state.consumed += value2;
        state.index += num2;
      };
      const append = (token) => {
        state.output += token.output != null ? token.output : token.value;
        consume(token.value);
      };
      const negate = () => {
        let count = 1;
        while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
          advance();
          state.start++;
          count++;
        }
        if (count % 2 === 0) {
          return false;
        }
        state.negated = true;
        state.start++;
        return true;
      };
      const increment = (type2) => {
        state[type2]++;
        stack.push(type2);
      };
      const decrement = (type2) => {
        state[type2]--;
        stack.pop();
      };
      const push = (tok) => {
        if (prev.type === "globstar") {
          const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
          const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
          if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
            state.output = state.output.slice(0, -prev.output.length);
            prev.type = "star";
            prev.value = "*";
            prev.output = star;
            state.output += prev.output;
          }
        }
        if (extglobs.length && tok.type !== "paren") {
          extglobs[extglobs.length - 1].inner += tok.value;
        }
        if (tok.value || tok.output) append(tok);
        if (prev && prev.type === "text" && tok.type === "text") {
          prev.output = (prev.output || prev.value) + tok.value;
          prev.value += tok.value;
          return;
        }
        tok.prev = prev;
        tokens.push(tok);
        prev = tok;
      };
      const extglobOpen = (type2, value2) => {
        const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
        token.prev = prev;
        token.parens = state.parens;
        token.output = state.output;
        token.startIndex = state.index;
        token.tokensIndex = tokens.length;
        const output = (opts.capture ? "(" : "") + token.open;
        increment("parens");
        push({ type: type2, value: value2, output: state.output ? "" : ONE_CHAR });
        push({ type: "paren", extglob: true, value: advance(), output });
        extglobs.push(token);
      };
      const extglobClose = (token) => {
        const literal = input.slice(token.startIndex, state.index + 1);
        const body = input.slice(token.startIndex + 2, state.index);
        const analysis = analyzeRepeatedExtglob(body, opts);
        if ((token.type === "plus" || token.type === "star") && analysis.risky) {
          const safeOutput = analysis.safeOutput ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput) : void 0;
          const open = tokens[token.tokensIndex];
          open.type = "text";
          open.value = literal;
          open.output = safeOutput || utils.escapeRegex(literal);
          for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
            tokens[i].value = "";
            tokens[i].output = "";
            delete tokens[i].suffix;
          }
          state.output = token.output + open.output;
          state.backtrack = true;
          push({ type: "paren", extglob: true, value, output: "" });
          decrement("parens");
          return;
        }
        let output = token.close + (opts.capture ? ")" : "");
        let rest;
        if (token.type === "negate") {
          let extglobStar = star;
          if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
            extglobStar = globstar(opts);
          }
          if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
            output = token.close = `)$))${extglobStar}`;
          }
          if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
            const expression = parse2(rest, { ...options, fastpaths: false }).output;
            output = token.close = `)${expression})${extglobStar})`;
          }
          if (token.prev.type === "bos") {
            state.negatedExtglob = true;
          }
        }
        push({ type: "paren", extglob: true, value, output });
        decrement("parens");
      };
      if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
        let backslashes = false;
        let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
          if (first === "\\") {
            backslashes = true;
            return m;
          }
          if (first === "?") {
            if (esc) {
              return esc + first + (rest ? QMARK.repeat(rest.length) : "");
            }
            if (index === 0) {
              return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
            }
            return QMARK.repeat(chars.length);
          }
          if (first === ".") {
            return DOT_LITERAL.repeat(chars.length);
          }
          if (first === "*") {
            if (esc) {
              return esc + first + (rest ? star : "");
            }
            return star;
          }
          return esc ? m : `\\${m}`;
        });
        if (backslashes === true) {
          if (opts.unescape === true) {
            output = output.replace(/\\/g, "");
          } else {
            output = output.replace(/\\+/g, (m) => {
              return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
            });
          }
        }
        if (output === input && opts.contains === true) {
          state.output = input;
          return state;
        }
        state.output = utils.wrapOutput(output, state, options);
        return state;
      }
      while (!eos()) {
        value = advance();
        if (value === "\0") {
          continue;
        }
        if (value === "\\") {
          const next = peek();
          if (next === "/" && opts.bash !== true) {
            continue;
          }
          if (next === "." || next === ";") {
            continue;
          }
          if (!next) {
            value += "\\";
            push({ type: "text", value });
            continue;
          }
          const match = /^\\+/.exec(remaining());
          let slashes = 0;
          if (match && match[0].length > 2) {
            slashes = match[0].length;
            state.index += slashes;
            if (slashes % 2 !== 0) {
              value += "\\";
            }
          }
          if (opts.unescape === true) {
            value = advance();
          } else {
            value += advance();
          }
          if (state.brackets === 0) {
            push({ type: "text", value });
            continue;
          }
        }
        if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
          if (opts.posix !== false && value === ":") {
            const inner = prev.value.slice(1);
            if (inner.includes("[")) {
              prev.posix = true;
              if (inner.includes(":")) {
                const idx = prev.value.lastIndexOf("[");
                const pre = prev.value.slice(0, idx);
                const rest2 = prev.value.slice(idx + 2);
                const posix2 = POSIX_REGEX_SOURCE[rest2];
                if (posix2) {
                  prev.value = pre + posix2;
                  state.backtrack = true;
                  advance();
                  if (!bos.output && tokens.indexOf(prev) === 1) {
                    bos.output = ONE_CHAR;
                  }
                  continue;
                }
              }
            }
          }
          if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
            value = `\\${value}`;
          }
          if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
            value = `\\${value}`;
          }
          if (opts.posix === true && value === "!" && prev.value === "[") {
            value = "^";
          }
          prev.value += value;
          append({ value });
          continue;
        }
        if (state.quotes === 1 && value !== '"') {
          value = utils.escapeRegex(value);
          prev.value += value;
          append({ value });
          continue;
        }
        if (value === '"') {
          state.quotes = state.quotes === 1 ? 0 : 1;
          if (opts.keepQuotes === true) {
            push({ type: "text", value });
          }
          continue;
        }
        if (value === "(") {
          increment("parens");
          push({ type: "paren", value });
          continue;
        }
        if (value === ")") {
          if (state.parens === 0 && opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("opening", "("));
          }
          const extglob = extglobs[extglobs.length - 1];
          if (extglob && state.parens === extglob.parens + 1) {
            extglobClose(extglobs.pop());
            continue;
          }
          push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
          decrement("parens");
          continue;
        }
        if (value === "[") {
          if (opts.nobracket === true || !remaining().includes("]")) {
            if (opts.nobracket !== true && opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("closing", "]"));
            }
            value = `\\${value}`;
          } else {
            increment("brackets");
          }
          push({ type: "bracket", value });
          continue;
        }
        if (value === "]") {
          if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          if (state.brackets === 0) {
            if (opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("opening", "["));
            }
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          decrement("brackets");
          const prevValue = prev.value.slice(1);
          if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
            value = `/${value}`;
          }
          prev.value += value;
          append({ value });
          if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
            continue;
          }
          const escaped = utils.escapeRegex(prev.value);
          state.output = state.output.slice(0, -prev.value.length);
          if (opts.literalBrackets === true) {
            state.output += escaped;
            prev.value = escaped;
            continue;
          }
          prev.value = `(${capture}${escaped}|${prev.value})`;
          state.output += prev.value;
          continue;
        }
        if (value === "{" && opts.nobrace !== true) {
          increment("braces");
          const open = {
            type: "brace",
            value,
            output: "(",
            outputIndex: state.output.length,
            tokensIndex: state.tokens.length
          };
          braces.push(open);
          push(open);
          continue;
        }
        if (value === "}") {
          const brace = braces[braces.length - 1];
          if (opts.nobrace === true || !brace) {
            push({ type: "text", value, output: value });
            continue;
          }
          let output = ")";
          if (brace.dots === true) {
            const arr2 = tokens.slice();
            const range = [];
            for (let i = arr2.length - 1; i >= 0; i--) {
              tokens.pop();
              if (arr2[i].type === "brace") {
                break;
              }
              if (arr2[i].type !== "dots") {
                range.unshift(arr2[i].value);
              }
            }
            output = expandRange(range, opts);
            state.backtrack = true;
          }
          if (brace.comma !== true && brace.dots !== true) {
            const out = state.output.slice(0, brace.outputIndex);
            const toks = state.tokens.slice(brace.tokensIndex);
            brace.value = brace.output = "\\{";
            value = output = "\\}";
            state.output = out;
            for (const t of toks) {
              state.output += t.output || t.value;
            }
          }
          push({ type: "brace", value, output });
          decrement("braces");
          braces.pop();
          continue;
        }
        if (value === "|") {
          if (extglobs.length > 0) {
            extglobs[extglobs.length - 1].conditions++;
          }
          push({ type: "text", value });
          continue;
        }
        if (value === ",") {
          let output = value;
          const brace = braces[braces.length - 1];
          if (brace && stack[stack.length - 1] === "braces") {
            brace.comma = true;
            output = "|";
          }
          push({ type: "comma", value, output });
          continue;
        }
        if (value === "/") {
          if (prev.type === "dot" && state.index === state.start + 1) {
            state.start = state.index + 1;
            state.consumed = "";
            state.output = "";
            tokens.pop();
            prev = bos;
            continue;
          }
          push({ type: "slash", value, output: SLASH_LITERAL });
          continue;
        }
        if (value === ".") {
          if (state.braces > 0 && prev.type === "dot") {
            if (prev.value === ".") prev.output = DOT_LITERAL;
            const brace = braces[braces.length - 1];
            prev.type = "dots";
            prev.output += value;
            prev.value += value;
            brace.dots = true;
            continue;
          }
          if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
            push({ type: "text", value, output: DOT_LITERAL });
            continue;
          }
          push({ type: "dot", value, output: DOT_LITERAL });
          continue;
        }
        if (value === "?") {
          const isGroup = prev && prev.value === "(";
          if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            extglobOpen("qmark", value);
            continue;
          }
          if (prev && prev.type === "paren") {
            const next = peek();
            let output = value;
            if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
              output = `\\${value}`;
            }
            push({ type: "text", value, output });
            continue;
          }
          if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
            push({ type: "qmark", value, output: QMARK_NO_DOT });
            continue;
          }
          push({ type: "qmark", value, output: QMARK });
          continue;
        }
        if (value === "!") {
          if (opts.noextglob !== true && peek() === "(") {
            if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
              extglobOpen("negate", value);
              continue;
            }
          }
          if (opts.nonegate !== true && state.index === 0) {
            negate();
            continue;
          }
        }
        if (value === "+") {
          if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            extglobOpen("plus", value);
            continue;
          }
          if (prev && prev.value === "(" || opts.regex === false) {
            push({ type: "plus", value, output: PLUS_LITERAL });
            continue;
          }
          if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
            push({ type: "plus", value });
            continue;
          }
          push({ type: "plus", value: PLUS_LITERAL });
          continue;
        }
        if (value === "@") {
          if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            push({ type: "at", extglob: true, value, output: "" });
            continue;
          }
          push({ type: "text", value });
          continue;
        }
        if (value !== "*") {
          if (value === "$" || value === "^") {
            value = `\\${value}`;
          }
          const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
          if (match) {
            value += match[0];
            state.index += match[0].length;
          }
          push({ type: "text", value });
          continue;
        }
        if (prev && (prev.type === "globstar" || prev.star === true)) {
          prev.type = "star";
          prev.star = true;
          prev.value += value;
          prev.output = star;
          state.backtrack = true;
          state.globstar = true;
          consume(value);
          continue;
        }
        let rest = remaining();
        if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
          extglobOpen("star", value);
          continue;
        }
        if (prev.type === "star") {
          if (opts.noglobstar === true) {
            consume(value);
            continue;
          }
          const prior = prev.prev;
          const before = prior.prev;
          const isStart = prior.type === "slash" || prior.type === "bos";
          const afterStar = before && (before.type === "star" || before.type === "globstar");
          if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
            push({ type: "star", value, output: "" });
            continue;
          }
          const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
          const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
          if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
            push({ type: "star", value, output: "" });
            continue;
          }
          while (rest.slice(0, 3) === "/**") {
            const after = input[state.index + 4];
            if (after && after !== "/") {
              break;
            }
            rest = rest.slice(3);
            consume("/**", 3);
          }
          const isEnd = eos() || state.parens > 0 && rest === ")".repeat(state.parens) && !extglobs.some((extglob) => extglob.type === "negate");
          if (prior.type === "bos" && eos()) {
            prev.type = "globstar";
            prev.value += value;
            prev.output = globstar(opts);
            state.output = prev.output;
            state.globstar = true;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && isEnd) {
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
            prev.value += value;
            state.globstar = true;
            state.output += prior.output + prev.output;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
            const end = rest[1] !== void 0 ? "|$" : "";
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
            prev.value += value;
            state.output += prior.output + prev.output;
            state.globstar = true;
            consume(value + advance());
            push({ type: "slash", value: "/", output: "" });
            continue;
          }
          if (prior.type === "bos" && rest[0] === "/") {
            prev.type = "globstar";
            prev.value += value;
            prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
            state.output = prev.output;
            state.globstar = true;
            consume(value + advance());
            push({ type: "slash", value: "/", output: "" });
            continue;
          }
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "globstar";
          prev.output = globstar(opts);
          prev.value += value;
          state.output += prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        const token = { type: "star", value, output: star };
        if (opts.bash === true) {
          token.output = ".*?";
          if (prev.type === "bos" || prev.type === "slash") {
            token.output = nodot + token.output;
          }
          push(token);
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
          token.output = value;
          push(token);
          continue;
        }
        if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
          if (prev.type === "dot") {
            state.output += NO_DOT_SLASH;
            prev.output += NO_DOT_SLASH;
          } else if (opts.dot === true) {
            state.output += NO_DOTS_SLASH;
            prev.output += NO_DOTS_SLASH;
          } else {
            state.output += nodot;
            prev.output += nodot;
          }
          if (peek() !== "*") {
            state.output += ONE_CHAR;
            prev.output += ONE_CHAR;
          }
        }
        push(token);
      }
      while (state.brackets > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
        state.output = utils.escapeLast(state.output, "[");
        decrement("brackets");
      }
      while (state.parens > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
        state.output = utils.escapeLast(state.output, "(");
        decrement("parens");
      }
      while (state.braces > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
        state.output = utils.escapeLast(state.output, "{");
        decrement("braces");
      }
      if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
        push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
      }
      if (state.backtrack === true) {
        state.output = "";
        for (const token of state.tokens) {
          state.output += token.output != null ? token.output : token.value;
          if (token.suffix) {
            state.output += token.suffix;
          }
        }
      }
      return state;
    };
    parse2.fastpaths = (input, options) => {
      const opts = { ...options };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      const len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      input = REPLACEMENTS[input] || input;
      const {
        DOT_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOTS,
        NO_DOTS_SLASH,
        STAR,
        START_ANCHOR
      } = constants.globChars(opts.windows);
      const nodot = opts.dot ? NO_DOTS : NO_DOT;
      const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
      const capture = opts.capture ? "" : "?:";
      const state = { negated: false, prefix: "" };
      let star = opts.bash === true ? ".*?" : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      const globstar = (opts2) => {
        if (opts2.noglobstar === true) return star;
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const create = (str) => {
        switch (str) {
          case "*":
            return `${nodot}${ONE_CHAR}${star}`;
          case ".*":
            return `${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*.*":
            return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*/*":
            return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
          case "**":
            return nodot + globstar(opts);
          case "**/*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
          case "**/*.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "**/.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
          default: {
            const match = /^(.*?)\.(\w+)$/.exec(str);
            if (!match) return;
            const source2 = create(match[1]);
            if (!source2) return;
            return source2 + DOT_LITERAL + match[2];
          }
        }
      };
      const output = utils.removePrefix(input, state);
      let source = create(output);
      if (source && opts.strictSlashes !== true) {
        source += `${SLASH_LITERAL}?`;
      }
      return source;
    };
    module2.exports = parse2;
  }
});

// node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS({
  "node_modules/picomatch/lib/picomatch.js"(exports2, module2) {
    "use strict";
    var scan = require_scan();
    var parse2 = require_parse();
    var utils = require_utils();
    var constants = require_constants2();
    var isObject2 = (val) => val && typeof val === "object" && !Array.isArray(val);
    var picomatch4 = (glob, options, returnState = false) => {
      if (Array.isArray(glob)) {
        const fns = glob.map((input) => picomatch4(input, options, returnState));
        const arrayMatcher = (str) => {
          for (const isMatch of fns) {
            const state2 = isMatch(str);
            if (state2) return state2;
          }
          return false;
        };
        return arrayMatcher;
      }
      const isState = isObject2(glob) && glob.tokens && glob.input;
      if (glob === "" || typeof glob !== "string" && !isState) {
        throw new TypeError("Expected pattern to be a non-empty string");
      }
      const opts = options || {};
      const posix2 = opts.windows;
      const regex = isState ? picomatch4.compileRe(glob, options) : picomatch4.makeRe(glob, options, false, true);
      const state = regex.state;
      delete regex.state;
      let isIgnored = () => false;
      if (opts.ignore) {
        const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
        isIgnored = picomatch4(opts.ignore, ignoreOpts, returnState);
      }
      const matcher = (input, returnObject = false) => {
        const { isMatch, match, output } = picomatch4.test(input, regex, options, { glob, posix: posix2 });
        const result = { glob, state, regex, posix: posix2, input, output, match, isMatch };
        if (typeof opts.onResult === "function") {
          opts.onResult(result);
        }
        if (isMatch === false) {
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (isIgnored(input)) {
          if (typeof opts.onIgnore === "function") {
            opts.onIgnore(result);
          }
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (typeof opts.onMatch === "function") {
          opts.onMatch(result);
        }
        return returnObject ? result : true;
      };
      if (returnState) {
        matcher.state = state;
      }
      return matcher;
    };
    picomatch4.test = (input, regex, options, { glob, posix: posix2 } = {}) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected input to be a string");
      }
      if (input === "") {
        return { isMatch: false, output: "" };
      }
      const opts = options || {};
      const format2 = opts.format || (posix2 ? utils.toPosixSlashes : null);
      let match = input === glob;
      let output = match && format2 ? format2(input) : input;
      if (match === false) {
        output = format2 ? format2(input) : input;
        match = output === glob;
      }
      if (match === false || opts.capture === true) {
        if (opts.matchBase === true || opts.basename === true) {
          match = picomatch4.matchBase(input, regex, options, posix2);
        } else {
          match = regex.exec(output);
        }
      }
      return { isMatch: Boolean(match), match, output };
    };
    picomatch4.matchBase = (input, glob, options, posix2 = options && options.windows) => {
      const regex = glob instanceof RegExp ? glob : picomatch4.makeRe(glob, options);
      return regex.test(utils.basename(input, { windows: posix2 }));
    };
    picomatch4.isMatch = (str, patterns, options) => picomatch4(patterns, options)(str);
    picomatch4.parse = (pattern, options) => {
      if (Array.isArray(pattern)) return pattern.map((p) => picomatch4.parse(p, options));
      return parse2(pattern, { ...options, fastpaths: false });
    };
    picomatch4.scan = (input, options) => scan(input, options);
    picomatch4.compileRe = (state, options, returnOutput = false, returnState = false) => {
      if (returnOutput === true) {
        return state.output;
      }
      const opts = options || {};
      const prepend = opts.contains ? "" : "^";
      const append = opts.contains ? "" : "$";
      let source = `${prepend}(?:${state.output})${append}`;
      if (state && state.negated === true) {
        source = `^(?!${source}).*$`;
      }
      const regex = picomatch4.toRegex(source, options);
      if (returnState === true) {
        regex.state = state;
      }
      return regex;
    };
    picomatch4.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
      if (!input || typeof input !== "string") {
        throw new TypeError("Expected a non-empty string");
      }
      let parsed = { negated: false, fastpaths: true };
      if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
        parsed.output = parse2.fastpaths(input, options);
      }
      if (!parsed.output) {
        parsed = parse2(input, options);
      }
      return picomatch4.compileRe(parsed, options, returnOutput, returnState);
    };
    picomatch4.toRegex = (source, options) => {
      try {
        const opts = options || {};
        return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
      } catch (err) {
        if (options && options.debug === true) throw err;
        return /$^/;
      }
    };
    picomatch4.constants = constants;
    module2.exports = picomatch4;
  }
});

// node_modules/picomatch/index.js
var require_picomatch2 = __commonJS({
  "node_modules/picomatch/index.js"(exports2, module2) {
    "use strict";
    var pico = require_picomatch();
    var utils = require_utils();
    function picomatch4(glob, options, returnState = false) {
      if (options && (options.windows === null || options.windows === void 0)) {
        options = { ...options, windows: utils.isWindows() };
      }
      return pico(glob, options, returnState);
    }
    Object.assign(picomatch4, pico);
    module2.exports = picomatch4;
  }
});

// packages/cli/src/main.ts
var crypto6 = __toESM(require("node:crypto"), 1);
var fs15 = __toESM(require("node:fs"), 1);
var os4 = __toESM(require("node:os"), 1);
var path18 = __toESM(require("node:path"), 1);
var readline = __toESM(require("node:readline"), 1);

// packages/core/src/types.ts
var DEFAULT_CONDITION = "succeeded()";

// packages/core/src/yaml.ts
var import_yaml = __toESM(require_dist(), 1);
function loadYaml(text2, file) {
  const lineCounter = new import_yaml.LineCounter();
  const doc = (0, import_yaml.parseDocument)(text2, { lineCounter, prettyErrors: false, uniqueKeys: false });
  const pos = (offset) => {
    const p = lineCounter.linePos(offset);
    return { file, line: p.line, column: p.col };
  };
  const diagnostics = [];
  for (const err of doc.errors) {
    diagnostics.push({ severity: "error", message: err.message.split("\n")[0], source: pos(err.pos[0]), code: "yaml" });
  }
  const convert = (node, fallback) => {
    if (node && (0, import_yaml.isAlias)(node)) node = node.resolve(doc);
    const src = node?.range ? pos(node.range[0]) : fallback;
    if (node && (0, import_yaml.isMap)(node)) {
      const entries = [];
      const seen = /* @__PURE__ */ new Map();
      for (const pair of node.items) {
        const key = convert(pair.key, src);
        if (key.kind !== "scalar") {
          diagnostics.push({ severity: "error", message: "Mapping keys must be plain text.", source: key.src, code: "yaml" });
          continue;
        }
        if (!key.text.startsWith("${{")) {
          const first = seen.get(key.text);
          if (first) diagnostics.push({ severity: "error", message: `Duplicate key '${key.text}': it is already set on line ${first.line}.`, source: key.src, code: "yaml-duplicate-key" });
          else seen.set(key.text, key.src);
        }
        entries.push({ key, value: convert(pair.value, key.src) });
      }
      return { kind: "map", entries, src };
    }
    if (node && (0, import_yaml.isSeq)(node)) {
      return { kind: "seq", items: node.items.map((item) => convert(item, src)), src };
    }
    if (node && (0, import_yaml.isScalar)(node)) {
      const value = node.value;
      if (typeof value === "string") return { kind: "scalar", value, text: value, src };
      if (typeof value === "number" || typeof value === "boolean") {
        return { kind: "scalar", value, text: typeof node.source === "string" ? node.source : String(value), src };
      }
      if (typeof value === "bigint") return { kind: "scalar", value: Number(value), text: String(value), src };
      return { kind: "scalar", value: null, text: "", src };
    }
    return { kind: "scalar", value: null, text: "", src };
  };
  if (doc.contents === null) return { root: null, diagnostics };
  return { root: convert(doc.contents, { file, line: 1, column: 1 }), diagnostics };
}
function isPMap(node) {
  return node?.kind === "map";
}
function isPSeq(node) {
  return node?.kind === "seq";
}
function isPScalar(node) {
  return node?.kind === "scalar";
}
function get(node, key) {
  if (!isPMap(node)) return void 0;
  return node.entries.find((e) => e.key.text === key)?.value;
}
function has(node, key) {
  return get(node, key) !== void 0;
}
function text(node) {
  return isPScalar(node) ? node.text : void 0;
}
function getText(node, key) {
  return text(get(node, key));
}
function withVia(node, via) {
  const append = (src) => ({ ...src, via: src.via ? append(src.via) : via });
  const walk = (n) => {
    if (n.kind === "map") {
      return { kind: "map", src: append(n.src), entries: n.entries.map((e) => ({ key: walk(e.key), value: walk(e.value) })) };
    }
    if (n.kind === "seq") return { kind: "seq", src: append(n.src), items: n.items.map(walk) };
    return { ...n, src: append(n.src) };
  };
  return walk(node);
}
function toPlain(node) {
  if (!node) return void 0;
  if (node.kind === "map") {
    const out = {};
    for (const e of node.entries) out[e.key.text] = toPlain(e.value);
    return out;
  }
  if (node.kind === "seq") return node.items.map(toPlain);
  return node.value;
}
function toYamlText(node) {
  return (0, import_yaml.stringify)(toPlain(node), { lineWidth: 0, defaultStringType: "PLAIN" });
}
function describeSource(src) {
  if (!src) return "";
  let out = `${src.file}:${src.line}:${src.column}`;
  if (src.via) out += ` (included from ${describeSource(src.via)})`;
  return out;
}

// packages/core/src/expressions.ts
var ExprError = class extends Error {
};
var Unknown = class {
  constructor(reason) {
    this.reason = reason;
  }
  reason;
};
var Version = class {
  constructor(parts) {
    this.parts = parts;
  }
  parts;
  toString() {
    return this.parts.join(".");
  }
};
var Resolver = class {
  constructor(get3) {
    this.get = get3;
  }
  get;
};
var PNODE = /* @__PURE__ */ Symbol("azp.pnode");
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if ("()[],*".includes(c)) {
      tokens.push({ k: "punct", v: c });
      i++;
    } else if (c === "'") {
      let out = "";
      i++;
      for (; ; ) {
        if (i >= src.length) throw new ExprError(`Unterminated string in expression: ${src}`);
        if (src[i] === "'") {
          if (src[i + 1] === "'") {
            out += "'";
            i += 2;
            continue;
          }
          i++;
          break;
        }
        out += src[i++];
      }
      tokens.push({ k: "str", v: out });
    } else if (/[0-9]/.test(c) || (c === "-" || c === "+") && /[0-9.]/.test(src[i + 1] ?? "")) {
      const m = /^[-+]?[0-9]*\.?[0-9]+(?:\.[0-9]+)*(?:[eE][-+]?[0-9]+)?/.exec(src.slice(i));
      if (!m) throw new ExprError(`Unexpected number in expression: ${src.slice(i)}`);
      const raw = m[0];
      const dots = raw.split(".").length - 1;
      if (dots >= 2) tokens.push({ k: "ver", v: new Version(raw.split(".").map(Number)) });
      else tokens.push({ k: "num", v: Number(raw) });
      i += raw.length;
    } else if (c === ".") {
      tokens.push({ k: "punct", v: "." });
      i++;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i));
      tokens.push({ k: "id", v: m[0] });
      i += m[0].length;
    } else {
      throw new ExprError(`Unexpected symbol '${c}' in expression: ${src}`);
    }
  }
  return tokens;
}
function parseExpression(src) {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isPunct = (v) => peek()?.k === "punct" && peek().v === v;
  const expect = (v) => {
    if (!isPunct(v)) throw new ExprError(`Expected '${v}' in expression: ${src}`);
    pos++;
  };
  const primary = () => {
    const tok = tokens[pos++];
    if (!tok) throw new ExprError(`Unexpected end of expression: ${src}`);
    if (tok.k === "str" || tok.k === "num" || tok.k === "ver") return { t: "lit", v: tok.v };
    if (tok.k === "id") {
      if (isPunct("(")) {
        pos++;
        const args = [];
        if (!isPunct(")")) {
          for (; ; ) {
            args.push(expr());
            if (isPunct(",")) pos++;
            else break;
          }
        }
        expect(")");
        return { t: "call", name: tok.v, args };
      }
      const lower = tok.v.toLowerCase();
      if (lower === "true") return { t: "lit", v: true };
      if (lower === "false") return { t: "lit", v: false };
      if (lower === "null") return { t: "lit", v: null };
      return { t: "name", name: tok.v };
    }
    throw new ExprError(`Unexpected '${tok.v}' in expression: ${src}`);
  };
  const expr = () => {
    let node = primary();
    for (; ; ) {
      if (isPunct(".")) {
        pos++;
        const tok = tokens[pos++];
        if (tok?.k === "punct" && tok.v === "*") node = { t: "star", obj: node };
        else if (tok?.k === "id") node = { t: "prop", obj: node, name: tok.v };
        else if (tok?.k === "num") node = { t: "prop", obj: node, name: String(tok.v) };
        else throw new ExprError(`Expected a property name after '.' in expression: ${src}`);
      } else if (isPunct("[")) {
        pos++;
        const index = expr();
        expect("]");
        node = { t: "index", obj: node, index };
      } else {
        return node;
      }
    }
  };
  const ast = expr();
  if (pos < tokens.length) throw new ExprError(`Unexpected '${tokens[pos].v}' in expression: ${src}`);
  return ast;
}
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Unknown) && !(v instanceof Version) && !(v instanceof Resolver);
}
function typeName(v) {
  if (v === null) return "Null";
  if (Array.isArray(v)) return "Array";
  if (v instanceof Version) return "Version";
  if (v instanceof Unknown) return "Unknown";
  if (v instanceof Resolver) return "Object";
  if (isObject(v)) return "Object";
  return typeof v === "string" ? "String" : typeof v === "number" ? "Number" : "Boolean";
}
function toStr(v) {
  if (v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (v instanceof Version) return v.toString();
  if (v instanceof Unknown) return "";
  throw new ExprError(`Unable to convert from ${typeName(v)} to String.`);
}
function toBool(v) {
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  return true;
}
function toNum(v) {
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    if (v === "") return 0;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  throw new ExprError(`Unable to convert from ${typeName(v)} to Number.`);
}
function toVersion(v) {
  if (v instanceof Version) return v;
  if (typeof v === "string" && /^\d+(\.\d+){1,3}$/.test(v)) return new Version(v.split(".").map(Number));
  throw new ExprError(`Unable to convert from ${typeName(v)} to Version.`);
}
function compare(left, right) {
  if (left === null) {
    if (right === null) return 0;
    left = typeof right === "number" ? 0 : typeof right === "boolean" ? false : "";
  }
  if (typeof left === "number") return Math.sign(left - toNum(right));
  if (typeof left === "boolean") return Number(left) - Number(toBool(right));
  if (typeof left === "string") {
    const a = left.toUpperCase();
    const b = toStr(right).toUpperCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (left instanceof Version) {
    const other = toVersion(right);
    for (let i = 0; i < Math.max(left.parts.length, other.parts.length); i++) {
      const d = (left.parts[i] ?? 0) - (other.parts[i] ?? 0);
      if (d !== 0) return Math.sign(d);
    }
    return 0;
  }
  throw new ExprError(`Cannot compare a value of type ${typeName(left)}.`);
}
function equal(left, right) {
  if ((isObject(left) || Array.isArray(left)) && (isObject(right) || Array.isArray(right))) return left === right;
  try {
    return compare(left, right) === 0;
  } catch {
    return false;
  }
}
function lookup(obj, key) {
  if (obj instanceof Unknown) return obj;
  if (obj instanceof Resolver) return obj.get(key);
  if (Array.isArray(obj)) {
    const index = Number(key);
    return Number.isInteger(index) && index >= 0 && index < obj.length ? obj[index] : null;
  }
  if (!isObject(obj)) return null;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lower) return obj[k];
  return null;
}
function formatDate(date, spec) {
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  return spec.replace(/yyyy|yy|MM|dd|HH|mm|ss|M|d|H|m|s/g, (token) => {
    switch (token) {
      case "yyyy":
        return String(date.getUTCFullYear());
      case "yy":
        return pad(date.getUTCFullYear() % 100);
      case "MM":
        return pad(date.getUTCMonth() + 1);
      case "M":
        return String(date.getUTCMonth() + 1);
      case "dd":
        return pad(date.getUTCDate());
      case "d":
        return String(date.getUTCDate());
      case "HH":
        return pad(date.getUTCHours());
      case "H":
        return String(date.getUTCHours());
      case "mm":
        return pad(date.getUTCMinutes());
      case "m":
        return String(date.getUTCMinutes());
      case "ss":
        return pad(date.getUTCSeconds());
      default:
        return String(date.getUTCSeconds());
    }
  });
}
function format(args) {
  const template = toStr(args[0]);
  let out = "";
  for (let i = 0; i < template.length; i++) {
    const c = template[i];
    if (c === "{") {
      if (template[i + 1] === "{") {
        out += "{";
        i++;
        continue;
      }
      const end = template.indexOf("}", i);
      if (end < 0) throw new ExprError(`The format string is invalid: ${template}`);
      const [indexText, ...specParts] = template.slice(i + 1, end).split(":");
      const index = Number(indexText);
      if (!Number.isInteger(index) || index < 0 || index + 1 >= args.length) {
        throw new ExprError(`The format string references argument ${indexText}, which was not supplied.`);
      }
      const arg = args[index + 1];
      const spec = specParts.join(":");
      if (spec) {
        const date = new Date(toStr(arg));
        if (Number.isNaN(date.getTime())) throw new ExprError(`Format specifier '${spec}' needs a date, got '${toStr(arg)}'.`);
        out += formatDate(date, spec);
      } else {
        out += toStr(arg);
      }
      i = end;
    } else if (c === "}") {
      if (template[i + 1] === "}") i++;
      out += "}";
    } else {
      out += c;
    }
  }
  return out;
}
function strip(v) {
  if (Array.isArray(v)) return v.map(strip);
  if (v instanceof Version) return v.toString();
  if (v instanceof Unknown) return null;
  if (isObject(v)) return Object.fromEntries(Object.keys(v).map((k) => [k, strip(v[k])]));
  return v;
}
var ci = (v) => toStr(v).toUpperCase();
var FUNCTIONS = {
  eq: { min: 2, max: 2, fn: ([a, b]) => equal(a, b) },
  ne: { min: 2, max: 2, fn: ([a, b]) => !equal(a, b) },
  gt: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) > 0 },
  ge: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) >= 0 },
  lt: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) < 0 },
  le: { min: 2, max: 2, fn: ([a, b]) => compare(a, b) <= 0 },
  not: { min: 1, max: 1, fn: ([a]) => !toBool(a) },
  xor: { min: 2, max: 2, fn: ([a, b]) => toBool(a) !== toBool(b) },
  in: { min: 1, max: Infinity, fn: ([needle, ...rest]) => rest.some((item) => equal(needle, item)) },
  notin: { min: 1, max: Infinity, fn: ([needle, ...rest]) => !rest.some((item) => equal(needle, item)) },
  contains: { min: 2, max: 2, fn: ([a, b]) => ci(a).includes(ci(b)) },
  containsvalue: {
    min: 2,
    max: 2,
    fn: ([collection, value]) => {
      const items = Array.isArray(collection) ? collection : isObject(collection) ? Object.values(collection) : [];
      return items.some((item) => !isObject(item) && !Array.isArray(item) && equal(item, value));
    }
  },
  startswith: { min: 2, max: 2, fn: ([a, b]) => ci(a).startsWith(ci(b)) },
  endswith: { min: 2, max: 2, fn: ([a, b]) => ci(a).endsWith(ci(b)) },
  coalesce: { min: 2, max: Infinity, fn: (args) => args.find((a) => a !== null && a !== "") ?? null },
  format: { min: 1, max: Infinity, fn: (args) => format(args) },
  join: {
    min: 2,
    max: 2,
    fn: ([sep6, collection]) => Array.isArray(collection) ? collection.map(toStr).join(toStr(sep6)) : toStr(collection)
  },
  length: {
    min: 1,
    max: 1,
    fn: ([a]) => Array.isArray(a) ? a.length : isObject(a) ? Object.keys(a).length : toStr(a).length
  },
  lower: { min: 1, max: 1, fn: ([a]) => toStr(a).toLowerCase() },
  upper: { min: 1, max: 1, fn: ([a]) => toStr(a).toUpperCase() },
  replace: { min: 3, max: 3, fn: ([a, b, c]) => toStr(b) === "" ? toStr(a) : toStr(a).split(toStr(b)).join(toStr(c)) },
  split: { min: 2, max: 2, fn: ([a, b]) => toStr(a).split(toStr(b)) },
  trim: { min: 1, max: 1, fn: ([a]) => toStr(a).trim() },
  converttojson: { min: 1, max: 1, fn: ([a]) => JSON.stringify(strip(a), null, 2) },
  counter: {
    min: 0,
    max: 2,
    fn: ([prefix, seed], ctx) => {
      if (!ctx.counter) throw new ExprError("counter() is only available in a runtime expression.");
      return ctx.counter(toStr(prefix ?? ""), seed === void 0 ? 0 : toNum(seed));
    }
  }
};
var SUPPORTED_FUNCTIONS = [...Object.keys(FUNCTIONS), "and", "or", "iif"];
var STATUS_FUNCTIONS = ["succeeded", "failed", "succeededorfailed", "always", "canceled"];
var filtered = /* @__PURE__ */ new WeakSet();
function access(obj, key) {
  if (Array.isArray(obj) && filtered.has(obj)) {
    const items = obj.map((item) => lookup(item, key)).filter((item) => item !== null);
    filtered.add(items);
    return items;
  }
  return lookup(obj, key);
}
function evalNode(node, ctx) {
  switch (node.t) {
    case "lit":
      return node.v;
    case "name": {
      const lower = node.name.toLowerCase();
      for (const key of Object.keys(ctx.named)) if (key.toLowerCase() === lower) return ctx.named[key];
      throw new ExprError(`Unrecognized value: '${node.name}'.`);
    }
    case "prop":
      return access(evalNode(node.obj, ctx), node.name);
    case "index": {
      const obj = evalNode(node.obj, ctx);
      const index = evalNode(node.index, ctx);
      if (index instanceof Unknown) return index;
      return access(obj, toStr(index));
    }
    case "star": {
      const obj = evalNode(node.obj, ctx);
      if (obj instanceof Unknown) return obj;
      const items = Array.isArray(obj) ? [...obj] : isObject(obj) ? Object.values(obj) : [];
      filtered.add(items);
      return items;
    }
    case "call":
      return evalCall(node, ctx);
  }
}
function evalCall(node, ctx) {
  const name = node.name.toLowerCase();
  if (name === "and" || name === "or") {
    if (node.args.length < 2) throw new ExprError(`${node.name}() needs at least 2 arguments.`);
    let unknown2;
    for (const arg of node.args) {
      const value = evalNode(arg, ctx);
      if (value instanceof Unknown) unknown2 ??= value;
      else if (toBool(value) === (name === "or")) return name === "or";
    }
    return unknown2 ?? name === "and";
  }
  if (name === "iif") {
    if (node.args.length !== 3) throw new ExprError("iif() needs exactly 3 arguments.");
    const condition = evalNode(node.args[0], ctx);
    if (condition instanceof Unknown) return condition;
    return evalNode(node.args[toBool(condition) ? 1 : 2], ctx);
  }
  const args = node.args.map((arg) => evalNode(arg, ctx));
  const extra = ctx.functions && Object.keys(ctx.functions).find((key) => key.toLowerCase() === name);
  if (extra) return ctx.functions[extra](args);
  const fn = FUNCTIONS[name];
  if (!fn) {
    if (STATUS_FUNCTIONS.includes(name)) throw new ExprError(`${node.name}() is not available in this kind of expression.`);
    throw new ExprError(`Unrecognized function: '${node.name}'.`);
  }
  if (args.length < fn.min || args.length > fn.max) {
    throw new ExprError(`${node.name}() was called with ${args.length} argument(s).`);
  }
  const unknown = args.find((arg) => arg instanceof Unknown);
  if (unknown) return unknown;
  return fn.fn(args, ctx);
}
var cache = /* @__PURE__ */ new Map();
function evaluate(text2, ctx) {
  let ast = cache.get(text2);
  if (!ast) {
    ast = parseExpression(text2);
    cache.set(text2, ast);
  }
  return evalNode(ast, ctx);
}
function pnodeToValue(node) {
  if (node.kind === "scalar") {
    if (typeof node.value === "number" && String(node.value) !== node.text) return node.text;
    return node.value;
  }
  if (node.kind === "seq") {
    const arr2 = node.items.map(pnodeToValue);
    Object.defineProperty(arr2, PNODE, { value: node, enumerable: false });
    return arr2;
  }
  const obj = {};
  for (const entry of node.entries) obj[entry.key.text] = pnodeToValue(entry.value);
  Object.defineProperty(obj, PNODE, { value: node, enumerable: false });
  return obj;
}
function valueToPNode(value, src) {
  if (value !== null && typeof value === "object") {
    const original = value[PNODE];
    if (original) return original;
    if (Array.isArray(value)) return { kind: "seq", src, items: value.map((item) => valueToPNode(item, src)) };
    if (isObject(value)) {
      return {
        kind: "map",
        src,
        entries: Object.keys(value).map((key) => ({
          key: { kind: "scalar", value: key, text: key, src },
          value: valueToPNode(value[key], src)
        }))
      };
    }
  }
  if (value instanceof Unknown || value instanceof Resolver || value === null) return { kind: "scalar", value: null, text: "", src };
  if (value instanceof Version) return { kind: "scalar", value: value.toString(), text: value.toString(), src };
  const scalarValue = value;
  return { kind: "scalar", value: scalarValue, text: toStr(scalarValue), src };
}

// packages/core/src/expand.ts
var path = __toESM(require("node:path"), 1);
var MAX_DEPTH = 50;
function splitExpressions(text2) {
  const parts = [];
  let i = 0;
  let lit = "";
  while (i < text2.length) {
    if (text2.startsWith("${{", i)) {
      let j = i + 3;
      let quoted = false;
      while (j < text2.length) {
        if (text2[j] === "'") quoted = !quoted;
        else if (!quoted && text2.startsWith("}}", j)) break;
        j++;
      }
      if (j >= text2.length) break;
      if (lit) parts.push({ lit });
      lit = "";
      parts.push({ expr: text2.slice(i + 3, j).trim() });
      i = j + 2;
    } else {
      lit += text2[i++];
    }
  }
  lit += text2.slice(i);
  if (lit) parts.push({ lit });
  return parts;
}
function parseDirective(keyText) {
  const parts = splitExpressions(keyText.trim());
  if (parts.length !== 1 || !("expr" in parts[0])) return void 0;
  const body = parts[0].expr;
  let m;
  if (m = /^(if|elseif)\s+([\s\S]+)$/i.exec(body)) return { kind: m[1].toLowerCase(), expr: m[2] };
  if (/^else$/i.test(body)) return { kind: "else" };
  if (/^insert$/i.test(body)) return { kind: "insert" };
  if (m = /^each\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([\s\S]+)$/i.exec(body)) return { kind: "each", variable: m[1], expr: m[2] };
  return void 0;
}
var Expander = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  diagnostics = [];
  files = /* @__PURE__ */ new Set();
  stack = [];
  error(message, source, code = "expand") {
    this.diagnostics.push({ severity: "error", message, source, code });
  }
  load(file, site) {
    const text2 = this.opts.readFile(file);
    if (text2 === void 0) {
      this.error(`File not found: ${path.relative(this.opts.workspaceRoot, file) || file}`, site, "template-not-found");
      return null;
    }
    this.files.add(file);
    const { root, diagnostics } = loadYaml(text2, file);
    this.diagnostics.push(...diagnostics.map((d) => site && d.source ? { ...d, source: { ...d.source, via: site } } : d));
    if (root === null) return { kind: "map", entries: [], src: { file, line: 1, column: 1 } };
    if (!isPMap(root)) {
      this.error("A pipeline or template file must be a mapping at the top level.", root.src);
      return null;
    }
    return root;
  }
  // --- parameters ------------------------------------------------------------
  bindParameters(tree, passed2, site, isRoot) {
    const declNode = get(tree, "parameters");
    const decls = [];
    const values = {};
    if (isPSeq(declNode)) {
      const known = /* @__PURE__ */ new Set();
      for (const item of declNode.items) {
        const name = getText(item, "name");
        if (!name) {
          this.error("A parameter needs a name.", item.src);
          continue;
        }
        known.add(name);
        const type2 = getText(item, "type") ?? "string";
        const defaultNode = get(item, "default");
        const allowed = get(item, "values");
        const decl = {
          name,
          type: type2,
          displayName: getText(item, "displayName"),
          hasDefault: defaultNode !== void 0,
          default: defaultNode ? stripValue(pnodeToValue(defaultNode)) : void 0,
          values: isPSeq(allowed) ? allowed.items.map((v) => stripValue(pnodeToValue(v))) : void 0,
          src: item.src
        };
        decls.push(decl);
        let value;
        if (Object.prototype.hasOwnProperty.call(passed2, name)) {
          value = passed2[name];
        } else if (defaultNode) {
          value = type2 === "string" && defaultNode.kind === "scalar" ? defaultNode.text : pnodeToValue(defaultNode);
        } else {
          this.error(
            isRoot ? `Parameter '${name}' has no default. Give it a value in .azp-local.yml under 'parameters:' or when starting the run.` : `A value for the '${name}' parameter must be provided.`,
            isRoot ? item.src : site,
            "parameter-missing"
          );
          value = type2 === "boolean" ? false : type2 === "number" ? 0 : "";
        }
        value = this.castParameter(name, type2, value, site);
        if (decl.values && !decl.values.some((v) => String(v).toLowerCase() === (typeof value === "object" ? "" : String(value)).toLowerCase())) {
          this.error(`'${String(value)}' is not an allowed value for parameter '${name}' (${decl.values.join(", ")}).`, site, "parameter-value");
        }
        values[name] = value;
      }
      for (const name of Object.keys(passed2)) {
        if (!known.has(name)) this.error(`Unexpected parameter '${name}'.`, isRoot ? declNode.src : site, "parameter-unexpected");
      }
    } else if (isPMap(declNode)) {
      for (const entry of declNode.entries) {
        values[entry.key.text] = pnodeToValue(entry.value);
        decls.push({ name: entry.key.text, type: "object", hasDefault: true, default: stripValue(values[entry.key.text]), src: entry.key.src });
      }
      Object.assign(values, passed2);
    } else {
      Object.assign(values, passed2);
    }
    return { decls, values };
  }
  castParameter(name, type2, value, site) {
    const isScalarValue = value === null || typeof value !== "object";
    switch (type2.toLowerCase()) {
      case "string":
        if (!isScalarValue) {
          this.error(`Parameter '${name}' expects a string.`, site, "parameter-type");
          return "";
        }
        return typeof value === "boolean" ? String(value) : toStr(value);
      case "boolean": {
        if (typeof value === "boolean") return value;
        const text2 = isScalarValue ? toStr(value).toLowerCase() : "";
        if (text2 === "true" || text2 === "false") return text2 === "true";
        this.error(`Parameter '${name}' expects true or false.`, site, "parameter-type");
        return false;
      }
      case "number": {
        const n = isScalarValue ? Number(toStr(value)) : NaN;
        if (Number.isNaN(n)) {
          this.error(`Parameter '${name}' expects a number.`, site, "parameter-type");
          return 0;
        }
        return n;
      }
      default:
        return value;
    }
  }
  // --- expression pass ---------------------------------------------------------
  evalExpr(expr, scope, src) {
    try {
      return evaluate(expr, scope);
    } catch (err) {
      if (err instanceof ExprError) {
        this.error(`${err.message} (in \${{ ${expr} }})`, src, "expression");
        return null;
      }
      throw err;
    }
  }
  expandNode(node, scope) {
    if (node.kind === "map") return this.expandMap(node, scope);
    if (node.kind === "seq") return this.expandSeq(node, scope);
    return this.expandScalar(node, scope);
  }
  expandScalar(node, scope) {
    if (typeof node.value !== "string" || !node.text.includes("${{")) return node;
    const parts = splitExpressions(node.text);
    if (parts.length === 1 && "expr" in parts[0]) {
      return valueToPNode(this.evalExpr(parts[0].expr, scope, node.src), node.src);
    }
    let out = "";
    for (const part of parts) {
      if ("lit" in part) {
        out += part.lit;
        continue;
      }
      const value = this.evalExpr(part.expr, scope, node.src);
      try {
        out += toStr(value);
      } catch (err) {
        this.error(`${err.message} (in \${{ ${part.expr} }})`, node.src, "expression");
      }
    }
    return { kind: "scalar", value: out, text: out, src: node.src };
  }
  bindings(d, scope, src) {
    const collection = this.evalExpr(d.expr, scope, src);
    const bind = (value) => ({ named: { ...scope.named, [d.variable]: value } });
    if (Array.isArray(collection)) return collection.map(bind);
    if (isObject(collection)) return Object.keys(collection).map((key) => bind({ key, value: collection[key] }));
    if (collection !== null) this.error(`\${{ each }} needs a sequence or a mapping, got '${String(collection)}'.`, src, "expression");
    return [];
  }
  expandMap(map, scope) {
    const out = [];
    const put = (entry) => {
      const index = out.findIndex((e) => e.key.text === entry.key.text);
      if (index >= 0) out[index] = entry;
      else out.push(entry);
    };
    const merge = (value, src) => {
      if (value.kind === "map") value.entries.forEach(put);
      else if (!(value.kind === "scalar" && value.value === null)) this.error("A mapping was expected inside this template expression.", src);
    };
    let chain = "none";
    for (const entry of map.entries) {
      const d = parseDirective(entry.key.text);
      const src = entry.key.src;
      if (!d) {
        chain = "none";
        const key = this.expandScalar(entry.key, scope);
        if (key.kind !== "scalar") {
          this.error("A mapping key must expand to text.", src);
          continue;
        }
        put({ key, value: this.expandNode(entry.value, scope) });
        continue;
      }
      switch (d.kind) {
        case "if": {
          const taken = toBool(this.evalExpr(d.expr, scope, src));
          chain = taken ? "closed" : "open";
          if (taken) merge(this.expandNode(entry.value, scope), src);
          break;
        }
        case "elseif":
          if (chain === "none") this.error("${{ elseif }} must follow ${{ if }}.", src);
          else if (chain === "open" && toBool(this.evalExpr(d.expr, scope, src))) {
            chain = "closed";
            merge(this.expandNode(entry.value, scope), src);
          }
          break;
        case "else":
          if (chain === "none") this.error("${{ else }} must follow ${{ if }}.", src);
          else if (chain === "open") merge(this.expandNode(entry.value, scope), src);
          chain = "none";
          break;
        case "each":
          chain = "none";
          for (const inner of this.bindings(d, scope, src)) merge(this.expandNode(entry.value, inner), src);
          break;
        case "insert":
          chain = "none";
          merge(this.expandNode(entry.value, scope), src);
          break;
      }
    }
    return { kind: "map", entries: out, src: map.src };
  }
  expandSeq(seq, scope) {
    const out = [];
    const splice = (value) => {
      if (value.kind === "seq") out.push(...value.items);
      else if (!(value.kind === "scalar" && value.value === null)) out.push(value);
    };
    let chain = "none";
    for (const item of seq.items) {
      const only = item.kind === "map" && item.entries.length === 1 ? item.entries[0] : void 0;
      const d = only ? parseDirective(only.key.text) : void 0;
      if (only && d && d.kind !== "insert") {
        const src = only.key.src;
        switch (d.kind) {
          case "if": {
            const taken = toBool(this.evalExpr(d.expr, scope, src));
            chain = taken ? "closed" : "open";
            if (taken) splice(this.expandNode(only.value, scope));
            break;
          }
          case "elseif":
            if (chain === "none") this.error("${{ elseif }} must follow ${{ if }}.", src);
            else if (chain === "open" && toBool(this.evalExpr(d.expr, scope, src))) {
              chain = "closed";
              splice(this.expandNode(only.value, scope));
            }
            break;
          case "else":
            if (chain === "none") this.error("${{ else }} must follow ${{ if }}.", src);
            else if (chain === "open") splice(this.expandNode(only.value, scope));
            chain = "none";
            break;
          case "each":
            chain = "none";
            for (const inner of this.bindings(d, scope, src)) splice(this.expandNode(only.value, inner));
            break;
        }
        continue;
      }
      chain = "none";
      if (item.kind === "scalar" && typeof item.value === "string") {
        const parts = splitExpressions(item.text);
        if (parts.length === 1 && "expr" in parts[0]) {
          const value = this.evalExpr(parts[0].expr, scope, item.src);
          if (Array.isArray(value)) out.push(...value.map((v) => valueToPNode(v, item.src)));
          else out.push(valueToPNode(value, item.src));
          continue;
        }
      }
      out.push(this.expandNode(item, scope));
    }
    return { kind: "seq", items: out, src: seq.src };
  }
  // --- files and includes ------------------------------------------------------
  resolveTemplate(ref, from, site) {
    let file = ref;
    let repoRoot = from.repoRoot;
    const at = ref.lastIndexOf("@");
    if (at > 0) {
      const alias = ref.slice(at + 1);
      file = ref.slice(0, at);
      if (alias !== "self") {
        const mapped = this.opts.repositories?.[alias];
        if (!mapped) {
          this.error(
            `Repository alias '${alias}' is not mapped to a local folder. Add it under 'repositories:' in .azp-local.yml.`,
            site,
            "repository-unmapped"
          );
          return void 0;
        }
        repoRoot = path.resolve(this.opts.workspaceRoot, mapped);
      } else {
        repoRoot = this.opts.workspaceRoot;
      }
      return { path: path.join(repoRoot, file), repoRoot };
    }
    if (file.startsWith("/") || file.startsWith("\\")) return { path: path.join(repoRoot, file), repoRoot };
    return { path: path.resolve(path.dirname(from.path), file), repoRoot };
  }
  /** Expands one file: its variables first, then everything else, then the templates it includes. */
  expandFile(tree, file, scope, depth) {
    const local = { named: { ...scope.named, variables: { ...scope.named.variables } } };
    const staticVars = local.named.variables;
    let variables;
    const variablesEntry = tree.entries.find((e) => e.key.text === "variables");
    if (variablesEntry) {
      variables = this.resolveVariables(this.expandNode(variablesEntry.value, local), file, local, depth);
      for (const item of normaliseVariables(variables)) {
        const name = getText(item, "name");
        const value = getText(item, "value");
        if (name && value !== void 0) staticVars[name] = value;
      }
    }
    const rest = { kind: "map", src: tree.src, entries: tree.entries.filter((e) => e.key.text !== "parameters" && e.key.text !== "variables") };
    const expanded = this.expandMap(rest, local);
    if (variables && variablesEntry) {
      const index = tree.entries.filter((e) => e.key.text !== "parameters").indexOf(variablesEntry);
      expanded.entries.splice(Math.min(index, expanded.entries.length), 0, { key: variablesEntry.key, value: variables });
    }
    return this.resolveStructure(expanded, file, local, depth);
  }
  include(item, section, from, scope, depth) {
    const ref = getText(item, "template") ?? "";
    const target = this.resolveTemplate(ref, from, item.src);
    if (!target) return [];
    if (depth >= MAX_DEPTH || this.stack.includes(target.path)) {
      this.error(`Template '${ref}' includes itself.`, item.src, "template-cycle");
      return [];
    }
    const loaded = this.load(target.path, item.src);
    if (!loaded) return [];
    const tree = withVia(loaded, item.src);
    const passed2 = {};
    const params = get(item, "parameters");
    if (isPMap(params)) for (const entry of params.entries) passed2[entry.key.text] = pnodeToValue(entry.value);
    const { values } = this.bindParameters(tree, passed2, item.src, false);
    this.stack.push(target.path);
    const expanded = this.expandFile(tree, target, { named: { parameters: values, variables: scope.named.variables } }, depth + 1);
    this.stack.pop();
    const body = get(expanded, section);
    if (section === "variables") return body ? normaliseVariables(body) : [];
    if (!isPSeq(body)) {
      this.error(`Template '${ref}' has no '${section}:' list, which is what this position needs.`, item.src, "template-section");
      return [];
    }
    return body.items;
  }
  resolveVariables(node, file, scope, depth) {
    if (!isPSeq(node) || !node.items.some((item) => isPMap(item) && get(item, "template"))) return node;
    const items = [];
    for (const item of node.items) {
      if (isPMap(item) && get(item, "template")) items.push(...this.include(item, "variables", file, scope, depth));
      else items.push(item);
    }
    return { kind: "seq", items, src: node.src };
  }
  resolveList(node, section, file, scope, depth) {
    if (!isPSeq(node)) return node;
    const items = [];
    for (const item of node.items) {
      if (isPMap(item) && get(item, "template")) {
        items.push(...this.include(item, section, file, scope, depth));
      } else if (isPMap(item) && section !== "steps") {
        items.push(this.resolveContainer(item, file, scope, depth));
      } else {
        items.push(item);
      }
    }
    return { kind: "seq", items, src: node.src };
  }
  /** A stage or a job: resolve the lists inside it. */
  resolveContainer(node, file, scope, depth) {
    const mapEntry = (entry) => {
      switch (entry.key.text) {
        case "jobs":
          return { key: entry.key, value: this.resolveList(entry.value, "jobs", file, scope, depth) };
        case "steps":
          return { key: entry.key, value: this.resolveList(entry.value, "steps", file, scope, depth) };
        case "variables":
          return { key: entry.key, value: this.resolveVariables(entry.value, file, scope, depth) };
        case "strategy":
          return { key: entry.key, value: this.resolveStrategy(entry.value, file, scope, depth) };
        default:
          return entry;
      }
    };
    return { kind: "map", src: node.src, entries: node.entries.map(mapEntry) };
  }
  /** Deployment strategies carry steps inside lifecycle hooks. */
  resolveStrategy(node, file, scope, depth) {
    if (!isPMap(node)) return node;
    const walk = (n) => {
      if (!isPMap(n)) return n;
      return {
        kind: "map",
        src: n.src,
        entries: n.entries.map(
          (e) => e.key.text === "steps" ? { key: e.key, value: this.resolveList(e.value, "steps", file, scope, depth) } : { key: e.key, value: walk(e.value) }
        )
      };
    };
    return {
      kind: "map",
      src: node.src,
      entries: node.entries.map((e) => ["runOnce", "rolling", "canary"].includes(e.key.text) ? { key: e.key, value: walk(e.value) } : e)
    };
  }
  resolveStructure(root, file, scope, depth) {
    let node = root;
    const ext = get(node, "extends");
    if (isPMap(ext) && get(ext, "template")) {
      const ref = getText(ext, "template") ?? "";
      const target = this.resolveTemplate(ref, file, ext.src);
      const loaded = target && !this.stack.includes(target.path) && depth < MAX_DEPTH ? this.load(target.path, ext.src) : null;
      const entries = node.entries.filter((e) => e.key.text !== "extends");
      if (target && loaded) {
        const tree = withVia(loaded, ext.src);
        const passed2 = {};
        const params = get(ext, "parameters");
        if (isPMap(params)) for (const entry of params.entries) passed2[entry.key.text] = pnodeToValue(entry.value);
        const { values } = this.bindParameters(tree, passed2, ext.src, false);
        this.stack.push(target.path);
        const base = this.expandFile(tree, target, { named: { parameters: values, variables: scope.named.variables } }, depth + 1);
        this.stack.pop();
        for (const entry of base.entries) {
          const index = entries.findIndex((e) => e.key.text === entry.key.text);
          if (index >= 0) entries[index] = entry;
          else entries.push(entry);
        }
        return { kind: "map", src: node.src, entries };
      }
      node = { kind: "map", src: node.src, entries };
    }
    return this.resolveContainer(
      {
        kind: "map",
        src: node.src,
        entries: node.entries.map(
          (e) => e.key.text === "stages" ? { key: e.key, value: this.resolveList(e.value, "stages", file, scope, depth) } : e
        )
      },
      file,
      scope,
      depth
    );
  }
};
function normaliseVariables(node) {
  if (isPSeq(node)) return node.items.filter(isPMap);
  if (isPMap(node)) {
    return node.entries.map((entry) => ({
      kind: "map",
      src: entry.key.src,
      entries: [
        { key: { kind: "scalar", value: "name", text: "name", src: entry.key.src }, value: entry.key },
        { key: { kind: "scalar", value: "value", text: "value", src: entry.key.src }, value: entry.value }
      ]
    }));
  }
  return [];
}
function stripValue(value) {
  if (Array.isArray(value)) return value.map(stripValue);
  if (value !== null && typeof value === "object") {
    const obj = value;
    return Object.fromEntries(Object.keys(obj).map((k) => [k, stripValue(obj[k])]));
  }
  return value;
}
function toValue(input) {
  if (input === null || input === void 0) return null;
  if (Array.isArray(input)) return input.map(toValue);
  if (typeof input === "object") return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, toValue(v)]));
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") return input;
  return String(input);
}
function expandPipeline(file, opts) {
  const expander = new Expander(opts);
  const tree = expander.load(file, void 0);
  if (!tree) return { root: null, diagnostics: expander.diagnostics, files: [...expander.files], parameters: [], parameterValues: {} };
  const passed2 = {};
  for (const [name, value] of Object.entries(opts.parameters ?? {})) passed2[name] = toValue(value);
  const declared = get(tree, "parameters");
  const names = isPSeq(declared) ? new Set(declared.items.map((item) => getText(item, "name"))) : isPMap(declared) ? new Set(declared.entries.map((e) => e.key.text)) : /* @__PURE__ */ new Set();
  for (const name of Object.keys(passed2)) if (!names.has(name)) delete passed2[name];
  const { decls, values } = expander.bindParameters(tree, passed2, tree.src, true);
  const variables = { ...opts.variables ?? {} };
  const root = expander.expandFile(tree, { path: file, repoRoot: opts.workspaceRoot }, { named: { parameters: values, variables } }, 0);
  return {
    root,
    diagnostics: expander.diagnostics,
    files: [...expander.files],
    parameters: decls,
    parameterValues: stripValue(values)
  };
}

// packages/core/src/variables.ts
var fs = __toESM(require("node:fs"), 1);
var path2 = __toESM(require("node:path"), 1);
function expandMacros(text2, lookup3, depth = 0) {
  if (!text2.includes("$(") || depth > 20) return text2;
  let out = "";
  let i = 0;
  while (i < text2.length) {
    const start = text2.indexOf("$(", i);
    if (start < 0) break;
    const end = text2.indexOf(")", start + 2);
    if (end < 0) break;
    const name = text2.slice(start + 2, end);
    const value = name.length > 0 ? lookup3(name) : void 0;
    if (value === void 0) {
      out += text2.slice(i, start + 2);
      i = start + 2;
    } else {
      out += text2.slice(i, start) + expandMacros(value, lookup3, depth + 1);
      i = end + 1;
    }
  }
  return out + text2.slice(i);
}
function envName(variable) {
  return variable.replace(/[.\s]/g, "_").toUpperCase();
}
var VariableBag = class _VariableBag {
  entries = /* @__PURE__ */ new Map();
  constructor(initial) {
    if (initial) for (const entry of initial) this.entries.set(entry.name.toLowerCase(), { ...entry });
  }
  set(name, value, flags = {}) {
    this.entries.set(name.toLowerCase(), { name, value, secret: flags.secret ?? false, readonly: flags.readonly ?? false });
  }
  get(name) {
    return this.entries.get(name.toLowerCase())?.value;
  }
  entry(name) {
    return this.entries.get(name.toLowerCase());
  }
  has(name) {
    return this.entries.has(name.toLowerCase());
  }
  all() {
    return [...this.entries.values()];
  }
  clone() {
    return new _VariableBag(this.entries.values());
  }
  expand(text2) {
    return expandMacros(text2, (name) => this.get(name));
  }
  /** Non-secret variables as environment variables. Secrets reach a step only through its own `env:`. */
  toEnv() {
    const env = {};
    for (const entry of this.entries.values()) {
      if (!entry.secret) env[envName(entry.name)] = this.expand(entry.value);
    }
    return env;
  }
  secrets() {
    return this.all().filter((e) => e.secret && e.value.length > 0).map((e) => e.value);
  }
};
function readGit(workspaceRoot) {
  try {
    const gitDir = path2.join(workspaceRoot, ".git");
    const head = fs.readFileSync(path2.join(gitDir, "HEAD"), "utf8").trim();
    const m = /^ref:\s*(.+)$/.exec(head);
    if (!m) return { sha: head };
    const ref = m[1];
    let sha2;
    try {
      sha2 = fs.readFileSync(path2.join(gitDir, ref), "utf8").trim();
    } catch {
      try {
        const packed = fs.readFileSync(path2.join(gitDir, "packed-refs"), "utf8");
        sha2 = packed.split("\n").find((line) => line.endsWith(` ${ref}`))?.split(" ")[0];
      } catch {
      }
    }
    return { branch: ref, sha: sha2 };
  } catch {
    return {};
  }
}
function staticVariables(workspaceRoot, pipelineFile, overrides = {}) {
  const git2 = readGit(workspaceRoot);
  const branch = git2.branch ?? "refs/heads/main";
  const repoName = path2.basename(workspaceRoot);
  const vars = {
    "Build.Reason": "Manual",
    "Build.SourceBranch": branch,
    "Build.SourceBranchName": branch.split("/").pop() ?? branch,
    "Build.SourceVersion": git2.sha ?? "0000000000000000000000000000000000000000",
    "Build.Repository.Name": repoName,
    "Build.Repository.Provider": "TfsGit",
    "Build.DefinitionName": path2.basename(pipelineFile).replace(/\.ya?ml$/i, ""),
    "Build.RequestedFor": "Local user",
    "Build.QueuedBy": "azp-local",
    "System.TeamProject": "local",
    "System.TeamFoundationCollectionUri": "https://localhost/azp-local/",
    "System.CollectionUri": "https://localhost/azp-local/",
    "System.DefinitionId": "1",
    "System.HostType": "build",
    "System.Debug": "false",
    TF_BUILD: "True"
  };
  for (const [name, value] of Object.entries(overrides)) {
    const existing = Object.keys(vars).find((k) => k.toLowerCase() === name.toLowerCase());
    vars[existing ?? name] = value;
  }
  const lower = (name) => Object.keys(vars).find((k) => k.toLowerCase() === name.toLowerCase());
  const sourceBranch = vars[lower("Build.SourceBranch")];
  if (overrides && !Object.keys(overrides).some((k) => k.toLowerCase() === "build.sourcebranchname")) {
    vars["Build.SourceBranchName"] = sourceBranch.split("/").pop() ?? sourceBranch;
  }
  if (vars["Build.Reason"] === "PullRequest") {
    vars["System.PullRequest.PullRequestId"] ??= "1";
    vars["System.PullRequest.SourceBranch"] ??= sourceBranch;
    vars["System.PullRequest.TargetBranch"] ??= "refs/heads/main";
  }
  return vars;
}
function formatBuildNumber(format2, now, buildId, rev, vars) {
  if (!format2) return String(buildId);
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  const dateFormat = (spec) => spec.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (token) => {
    switch (token) {
      case "yyyy":
        return String(now.getFullYear());
      case "yy":
        return pad(now.getFullYear() % 100);
      case "MM":
        return pad(now.getMonth() + 1);
      case "dd":
        return pad(now.getDate());
      case "HH":
        return pad(now.getHours());
      case "mm":
        return pad(now.getMinutes());
      default:
        return pad(now.getSeconds());
    }
  });
  const startOfYear = new Date(now.getFullYear(), 0, 0).getTime();
  const tokens = {
    "build.buildid": String(buildId),
    buildid: String(buildId),
    builddefinitionname: vars["Build.DefinitionName"] ?? "",
    sourcebranchname: vars["Build.SourceBranchName"] ?? "",
    teamproject: vars["System.TeamProject"] ?? "",
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    dayofmonth: String(now.getDate()),
    dayofyear: String(Math.floor((now.getTime() - startOfYear) / 864e5)),
    hours: String(now.getHours()),
    minutes: String(now.getMinutes()),
    seconds: String(now.getSeconds())
  };
  let withoutRev = format2.replace(/\$\(([^)]+)\)/g, (whole, body) => {
    const [name, ...rest] = body.split(":");
    const spec = rest.join(":");
    const key = name.trim().toLowerCase();
    if (key === "date") return dateFormat(spec || "yyyyMMdd");
    if (key === "year" && spec) return dateFormat(spec);
    if (key === "rev") return whole;
    return tokens[key] ?? whole;
  });
  withoutRev = expandMacros(withoutRev, (name) => name.toLowerCase().startsWith("rev:") ? void 0 : vars[name]);
  const base = withoutRev.replace(/\$\(rev:[^)]*\)/gi, "");
  return withoutRev.replace(/\$\(rev:([^)]*)\)/gi, (_whole, spec) => {
    const n = rev(base);
    return spec.replace(/r+/, (rs) => String(n).padStart(rs.length, "0"));
  });
}

// packages/core/src/config.ts
var fs2 = __toESM(require("node:fs"), 1);
var path3 = __toESM(require("node:path"), 1);
var CONFIG_FILE = ".azp-local.yml";
var KNOWN_KEYS = ["pipelines", "images", "repositories", "parameters", "variables", "variableGroups", "tasks", "workspace", "dockerSocket"];
function emptyConfig() {
  return {
    pipelines: [],
    images: {},
    repositories: {},
    parameters: {},
    variables: {},
    variableGroups: {},
    tasks: {},
    workspace: "copy",
    dockerSocket: false,
    diagnostics: []
  };
}
function parseConfig(text2, file) {
  const config = emptyConfig();
  config.file = file;
  const { root, diagnostics } = loadYaml(text2, file);
  config.diagnostics.push(...diagnostics);
  if (root === null) return config;
  const problem = (message, node, severity = "error") => config.diagnostics.push({ severity, message, source: node.src, code: "config" });
  if (!isPMap(root)) {
    problem(`${CONFIG_FILE} must be a mapping.`, root);
    return config;
  }
  const stringMap = (key) => {
    const node = get(root, key);
    const out = {};
    if (node === void 0) return out;
    if (!isPMap(node)) {
      problem(`'${key}' must be a mapping.`, node);
      return out;
    }
    for (const entry of node.entries) {
      if (isPScalar(entry.value)) out[entry.key.text] = entry.value.text;
      else problem(`'${key}.${entry.key.text}' must be text.`, entry.value);
    }
    return out;
  };
  for (const entry of root.entries) {
    if (!KNOWN_KEYS.includes(entry.key.text)) problem(`Unknown key '${entry.key.text}'.`, entry.key, "warning");
  }
  const pipelines = get(root, "pipelines");
  if (isPSeq(pipelines)) config.pipelines = pipelines.items.filter(isPScalar).map((item) => item.text);
  else if (pipelines) problem("'pipelines' must be a list of file paths.", pipelines);
  config.images = stringMap("images");
  config.repositories = stringMap("repositories");
  config.variables = stringMap("variables");
  const parameters = get(root, "parameters");
  if (isPMap(parameters)) config.parameters = toPlain(parameters);
  else if (parameters) problem("'parameters' must be a mapping.", parameters);
  const groups = get(root, "variableGroups");
  if (isPMap(groups)) {
    for (const group of groups.entries) {
      const values = {};
      if (isPMap(group.value)) {
        for (const entry of group.value.entries) {
          if (isPScalar(entry.value)) values[entry.key.text] = { value: entry.value.text, secret: false };
          else if (isPMap(entry.value) && get(entry.value, "secret")) {
            const secret = get(entry.value, "secret");
            values[entry.key.text] = { secret: isPScalar(secret) && secret.value === true };
            if (get(entry.value, "value")) problem("A secret must not have a value here; it is prompted for and kept in the keychain.", entry.value);
          } else problem(`'${entry.key.text}' must be a value or { secret: true }.`, entry.value);
        }
      } else problem(`Variable group '${group.key.text}' must be a mapping.`, group.value);
      config.variableGroups[group.key.text] = values;
    }
  } else if (groups) problem("'variableGroups' must be a mapping.", groups);
  const tasks = get(root, "tasks");
  if (isPMap(tasks)) {
    for (const entry of tasks.entries) {
      let override;
      if (isPScalar(entry.value)) {
        if (entry.value.text === "skip") override = { action: "skip" };
        else if (entry.value.text === "fail") override = { action: "fail" };
      } else if (isPMap(entry.value)) {
        const script = get(entry.value, "script");
        const taskPath = get(entry.value, "path");
        if (isPScalar(script)) override = { action: "script", script: script.text };
        else if (isPScalar(taskPath)) override = { action: "path", path: taskPath.text };
      }
      if (override) config.tasks[entry.key.text] = override;
      else problem(`Task '${entry.key.text}' must be skip, fail, { script: file } or { path: folder }.`, entry.value);
    }
  } else if (tasks) problem("'tasks' must be a mapping.", tasks);
  const workspace = get(root, "workspace");
  if (isPScalar(workspace)) {
    if (workspace.text === "copy" || workspace.text === "mount") config.workspace = workspace.text;
    else problem("'workspace' must be copy or mount.", workspace);
  }
  const socket = get(root, "dockerSocket");
  if (isPScalar(socket)) config.dockerSocket = socket.value === true;
  return config;
}
function loadConfig(workspaceRoot, readFile) {
  const file = path3.join(workspaceRoot, CONFIG_FILE);
  let text2;
  try {
    text2 = readFile ? readFile(file) : fs2.readFileSync(file, "utf8");
  } catch {
    text2 = void 0;
  }
  return text2 === void 0 ? emptyConfig() : parseConfig(text2, file);
}
function taskOverride(config, name, version) {
  const wanted = [`${name}@${version}`.toLowerCase(), name.toLowerCase()];
  for (const want of wanted) {
    const key = Object.keys(config.tasks).find((k) => k.toLowerCase() === want);
    if (key) return config.tasks[key];
  }
  return void 0;
}

// packages/core/src/tasks.ts
var BUILT_IN_TASKS = /* @__PURE__ */ new Set([
  "cmdline",
  "bash",
  "powershell",
  "usenode",
  "nodetool",
  "cache",
  "publishpipelineartifact",
  "downloadpipelineartifact",
  "publishbuildartifacts",
  "downloadbuildartifacts",
  "publishtestresults",
  "publishcodecoverageresults"
]);
var AGENTLESS = /* @__PURE__ */ new Set(["manualvalidation", "delay", "invokerestapi", "azurefunction", "queryworkitems", "azuremonitor", "publishtoazureservicebus"]);
var NEEDS_CONNECTION_BY_NAME = [
  /^azure/i,
  /^kubernetes/i,
  /^helm/i,
  /^servicefabric/i,
  /^sqlazure/i,
  /^iisweb/i,
  /^(npm|pip|twine|nuget|maven|cargo)authenticate$/i,
  /^(ssh|copyfilesoverssh|ftpupload|windowsmachinefilecopy|githubrelease|githubcomment)$/i,
  /^sonar(cloud|qube)prepare$/i,
  /^(downloadsecurefile|installsshkey|installapplecertificate|installappleprovisioningprofile)$/i,
  /^universalpackages$/i
];
var CONNECTION_INPUT = /^(azureSubscription|azureResourceManagerConnection|connectedService\w*|\w*serviceConnection|\w*serviceEndpoint|containerRegistry|dockerRegistryEndpoint|gitHubConnection|externalEndpoints?|sshEndpoint|SonarCloud|SonarQube|azure_static_web_apps_api_token)$/i;
function classifyTask(name, inputs) {
  const lower = name.toLowerCase();
  if (BUILT_IN_TASKS.has(lower)) return { tier: 1, reason: "Built into the local engine." };
  if (AGENTLESS.has(lower)) return { tier: 3, reason: "Agentless task: it runs on the Azure DevOps server, not on an agent." };
  const input = Object.keys(inputs).find((key) => CONNECTION_INPUT.test(key));
  if (input) return { tier: 3, reason: `Needs a service connection or cloud credential (input '${input}').` };
  if (NEEDS_CONNECTION_BY_NAME.some((re) => re.test(name))) return { tier: 3, reason: "Needs a service connection to an external service." };
  return { tier: 2, reason: "Runs the task's own Node handler from its package." };
}

// packages/core/src/model.ts
var fs3 = __toESM(require("node:fs"), 1);
var path4 = __toESM(require("node:path"), 1);

// packages/core/src/lint.ts
var COMMON_STEP = ["name", "displayName", "condition", "continueOnError", "enabled", "env", "timeoutInMinutes", "retryCountOnTaskFailure", "target"];
var STEP_BODY = [
  "script",
  "bash",
  "pwsh",
  "powershell",
  "task",
  "checkout",
  "download",
  "publish",
  "inputs",
  "workingDirectory",
  "failOnStderr",
  "errorActionPreference",
  "ignoreLASTEXITCODE",
  "clean",
  "fetchDepth",
  "fetchTags",
  "lfs",
  "persistCredentials",
  "submodules",
  "path",
  "sparseCheckoutDirectories",
  "sparseCheckoutPatterns",
  "fetchFilter",
  "artifact",
  "patterns",
  "properties"
];
var STEP_KEYS = [...COMMON_STEP, ...STEP_BODY];
var UNCHECKED_STEPS = ["downloadBuild", "getPackage", "reviewApp"];
var JOB_KEYS = [
  "job",
  "deployment",
  "displayName",
  "dependsOn",
  "condition",
  "strategy",
  "continueOnError",
  "pool",
  "workspace",
  "container",
  "services",
  "timeoutInMinutes",
  "cancelTimeoutInMinutes",
  "variables",
  "steps",
  "uses",
  "templateContext",
  "environment",
  "lockBehavior"
];
var STAGE_KEYS = ["stage", "displayName", "dependsOn", "condition", "variables", "jobs", "pool", "lockBehavior", "trigger", "isSkippable", "templateContext"];
var ROOT_KEYS = [
  "name",
  "appendCommitMessageToRunName",
  "trigger",
  "pr",
  "schedules",
  "resources",
  "variables",
  "parameters",
  "stages",
  "jobs",
  "steps",
  "extends",
  "lockBehavior",
  "uses",
  "templateContext",
  ...JOB_KEYS.filter((k) => k !== "job" && k !== "deployment")
];
var HOOKS = ["preDeploy", "deploy", "routeTraffic", "postRouteTraffic"];
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}
function suggest(word, known) {
  const lower = word.toLowerCase();
  const exact = known.find((k) => k.toLowerCase() === lower);
  if (exact) return exact;
  const limit = word.length < 5 ? 1 : 2;
  let best;
  for (const name of known) {
    const d = distance(lower, name.toLowerCase());
    if (d <= limit && (!best || d < best.d)) best = { name, d };
  }
  return best?.name;
}
function unknownKeys(node, known, where, out) {
  for (const { key } of node.entries) {
    if (key.text.startsWith("${{") || known.includes(key.text)) continue;
    const near = suggest(key.text, known);
    out.push({
      severity: "warning",
      message: `Unexpected key '${key.text}' in ${where}.${near ? ` Did you mean '${near}'?` : ""}`,
      source: key.src,
      code: "unknown-key"
    });
  }
}
function lintSteps(steps, out) {
  if (!isPSeq(steps)) return;
  for (const step of steps.items) {
    if (!isPMap(step) || UNCHECKED_STEPS.some((k) => step.entries.some((e) => e.key.text === k))) continue;
    unknownKeys(step, STEP_KEYS, "a step", out);
  }
}
function lintJobs(jobs, out) {
  if (!isPSeq(jobs)) return;
  for (const job of jobs.items) {
    if (!isPMap(job)) continue;
    unknownKeys(job, JOB_KEYS, "a job", out);
    if (job.entries.some((e) => e.key.text === "deployment")) {
      const strategy = get(job, "strategy");
      for (const kind of ["runOnce", "rolling", "canary"]) {
        const body = get(strategy, kind);
        for (const hook of HOOKS) lintSteps(get(get(body, hook), "steps"), out);
        for (const outcome of ["success", "failure"]) lintSteps(get(get(get(body, "on"), outcome), "steps"), out);
      }
    } else if (job.entries.some((e) => e.key.text === "job")) {
      const steps = get(job, "steps");
      if (steps === void 0 || isPSeq(steps) && steps.items.length === 0) {
        if (getText(job, "pool") !== "server") {
          out.push({ severity: "warning", message: `Job '${getText(job, "job") ?? ""}' has no steps, so it does nothing.`, source: job.src, code: "job-no-steps" });
        }
      }
      lintSteps(steps, out);
    }
  }
}
function lintPipeline(root) {
  const out = [];
  unknownKeys(root, ROOT_KEYS, "a pipeline", out);
  const stages = get(root, "stages");
  if (isPSeq(stages)) {
    for (const stage of stages.items) {
      if (!isPMap(stage)) continue;
      unknownKeys(stage, STAGE_KEYS, "a stage", out);
      const jobs = get(stage, "jobs");
      if (jobs === void 0 || isPSeq(jobs) && jobs.items.length === 0) {
        out.push({ severity: "warning", message: `Stage '${getText(stage, "stage") ?? ""}' has no jobs, so it does nothing.`, source: stage.src, code: "stage-no-jobs" });
      }
      lintJobs(jobs, out);
    }
  }
  lintJobs(get(root, "jobs"), out);
  if (!isPSeq(stages) && !isPSeq(get(root, "jobs"))) lintSteps(get(root, "steps"), out);
  return out;
}
function findCycle(edges) {
  const state = /* @__PURE__ */ new Map();
  const stack = [];
  const visit = (node) => {
    state.set(node, "open");
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      if (!edges.has(next)) continue;
      if (state.get(next) === "open") return [...stack.slice(stack.indexOf(next)), next];
      if (!state.has(next)) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(node, "done");
    return void 0;
  };
  for (const node of edges.keys()) {
    if (state.has(node)) continue;
    const found = visit(node);
    if (found) return found;
  }
  return void 0;
}

// packages/core/src/model.ts
var STEP_KEYS2 = ["script", "bash", "pwsh", "powershell", "checkout", "download", "publish", "task", "template", "downloadBuild", "getPackage", "reviewApp"];
var LIFECYCLE_HOOKS = ["preDeploy", "deploy", "routeTraffic", "postRouteTraffic"];
function defaultReadFile(file) {
  try {
    return fs3.readFileSync(file, "utf8");
  } catch {
    return void 0;
  }
}
function list(node) {
  if (isPScalar(node)) return node.text ? [node.text] : [];
  if (isPSeq(node)) return node.items.filter(isPScalar).map((item) => item.text);
  return [];
}
function bool(node, fallback) {
  if (!isPScalar(node)) return fallback;
  if (typeof node.value === "boolean") return node.value;
  const text2 = node.text.toLowerCase();
  return text2 === "true" ? true : text2 === "false" ? false : fallback;
}
function num(node) {
  if (!isPScalar(node) || node.text === "") return void 0;
  const n = Number(node.text);
  return Number.isNaN(n) ? void 0 : n;
}
function record(node) {
  const out = {};
  if (!isPMap(node)) return out;
  for (const entry of node.entries) {
    out[entry.key.text] = isPScalar(entry.value) ? entry.value.text : JSON.stringify(toPlain(entry.value));
  }
  return out;
}
function readVariables(node) {
  const out = [];
  for (const item of normaliseVariables(node)) {
    const group = getText(item, "group");
    const name = getText(item, "name");
    if (group) out.push({ name: "", value: "", group, src: item.src });
    else if (name) out.push({ name, value: getText(item, "value") ?? "", readonly: bool(get(item, "readonly"), false), src: item.src });
  }
  return out;
}
var Builder = class {
  constructor(config, baseVars) {
    this.config = config;
    this.baseVars = baseVars;
  }
  config;
  baseVars;
  diagnostics = [];
  containers = {};
  warn(message, source, severity = "warning", code = "model") {
    if (this.diagnostics.some((d) => d.message === message && d.source?.file === source.file && d.source.line === source.line && d.source.column === source.column)) return;
    this.diagnostics.push({ severity, message, source, code });
  }
  /** Reports a `condition:` that is not a valid expression, on the line that holds it. */
  condition(node, fallback = DEFAULT_CONDITION) {
    const value = getText(node, "condition");
    if (value === void 0) return fallback;
    try {
      parseExpression(value);
    } catch (err) {
      if (!(err instanceof ExprError)) throw err;
      const detail = err.message.replace(/ (in|of) expression:[\s\S]*$/, (_, word) => word === "of" ? " of the condition" : "");
      this.warn(`Invalid condition '${value}': ${detail}.`, get(node, "condition").src, "error", "condition");
    }
    return value;
  }
  /** Reports a loop among stages or among the jobs of a stage: none of them could ever start. */
  cycles(label, members) {
    const edges = new Map(members.map((m) => [m.name, m.dependsOn]));
    const loop = findCycle(edges);
    if (!loop) return;
    const first = members.find((m) => m.name === loop[0]);
    const message = loop.length === 2 ? `${label} '${loop[0]}' depends on itself.` : `${label}s depend on each other in a loop: ${loop.join(" \u2192 ")}.`;
    this.warn(message, first.src, "error", "dependency-cycle");
  }
  /** Values that are known before the run and can be shown in names and pool labels. */
  known(base, decls) {
    const out = { ...base };
    for (const decl of decls) {
      if (decl.group) {
        const group = this.config.variableGroups[decl.group];
        if (group) {
          for (const [name, entry] of Object.entries(group)) if (!entry.secret && entry.value !== void 0) out[name] = entry.value;
        }
      } else if (!decl.value.trimStart().startsWith("$[")) {
        out[decl.name] = decl.value;
      }
    }
    return out;
  }
  build(root, file, expand) {
    const resources = get(get(root, "resources"), "containers");
    if (isPSeq(resources)) {
      for (const item of resources.items) {
        const alias = getText(item, "container");
        const spec = this.containerSpec(item);
        if (alias && spec) this.containers[alias] = { ...spec, alias };
      }
    }
    const variables = readVariables(get(root, "variables"));
    const vars = this.known(this.baseVars, variables);
    const rootPool = get(root, "pool");
    let stages = [];
    const stagesNode = get(root, "stages");
    if (isPSeq(stagesNode)) {
      let previous;
      stagesNode.items.forEach((node, index) => {
        if (!isPMap(node)) return this.warn("A stage must be a mapping.", node.src, "error");
        const stage = this.stage(node, index, previous, rootPool, vars);
        stages.push(stage);
        previous = stage.id;
      });
    } else if (isPSeq(get(root, "jobs"))) {
      stages = [this.implicitStage(root, get(root, "jobs").items, rootPool, vars)];
    } else if (isPSeq(get(root, "steps"))) {
      stages = [this.implicitStage(root, [root], rootPool, vars)];
    } else if (!has(root, "extends")) {
      this.warn("This file has no 'stages', 'jobs' or 'steps', so there is nothing to run.", root.src, "error", "empty");
    }
    const ids = /* @__PURE__ */ new Set();
    for (const stage of stages) {
      for (const dep of stage.dependsOn) {
        if (!stages.some((s) => s.id === dep)) this.warn(`Stage '${stage.id}' depends on '${dep}', which does not exist.`, stage.src, "error");
      }
      for (const job of stage.jobs) {
        if (ids.has(job.id)) this.warn(`Job '${job.name}' is defined more than once in stage '${stage.id}'.`, job.src, "error");
        ids.add(job.id);
        for (const dep of job.dependsOn) {
          if (!stage.jobs.some((j) => j.name === dep)) this.warn(`Job '${job.name}' depends on '${dep}', which is not in this stage.`, job.src, "error");
        }
      }
      this.cycles("Job", stage.jobs.map((j) => ({ name: j.name, dependsOn: j.dependsOn, src: j.src })));
    }
    this.cycles("Stage", stages.map((s) => ({ name: s.id, dependsOn: s.dependsOn, src: s.src })));
    if (!expand.diagnostics.some((d) => d.severity === "error" && d.code === "yaml")) {
      for (const finding of lintPipeline(root)) this.warn(finding.message, finding.source, finding.severity, finding.code);
    }
    return {
      name: getText(root, "name"),
      file,
      triggers: this.triggers(root),
      parameters: expand.parameters,
      parameterValues: expand.parameterValues,
      variables,
      stages,
      files: expand.files,
      diagnostics: [...expand.diagnostics, ...this.diagnostics]
    };
  }
  triggers(root) {
    const describe = (node, absent) => {
      if (node === void 0) return absent;
      if (isPScalar(node)) return node.text === "none" ? "disabled" : `branch ${node.text}`;
      if (isPSeq(node)) return `branches ${list(node).join(", ")}`;
      const parts = [];
      for (const kind of ["branches", "paths", "tags"]) {
        const include = list(get(get(node, kind), "include"));
        const exclude = list(get(get(node, kind), "exclude"));
        if (include.length) parts.push(`${kind} ${include.join(", ")}`);
        if (exclude.length) parts.push(`not ${kind} ${exclude.join(", ")}`);
      }
      return parts.join("; ") || "enabled";
    };
    const schedules = get(root, "schedules");
    return {
      ci: describe(get(root, "trigger"), "every branch (default)"),
      pr: describe(get(root, "pr"), "every pull request (default)"),
      schedules: isPSeq(schedules) ? schedules.items.map((item) => ({ cron: getText(item, "cron") ?? "", displayName: getText(item, "displayName") })) : []
    };
  }
  implicitStage(root, jobNodes, rootPool, vars) {
    const stage = {
      id: "__default",
      displayName: "Jobs",
      implicit: true,
      dependsOn: [],
      condition: DEFAULT_CONDITION,
      variables: [],
      jobs: [],
      src: root.src
    };
    stage.jobs = this.jobs(jobNodes, stage.id, rootPool, vars, jobNodes.length === 1 && jobNodes[0] === root);
    return stage;
  }
  stage(node, index, previous, rootPool, vars) {
    const id = getText(node, "stage") || `Stage${index + 1}`;
    const variables = readVariables(get(node, "variables"));
    const stageVars = this.known(vars, variables);
    const text2 = (value) => expandMacros(value, (name) => lookupCI(stageVars, name));
    const jobsNode = get(node, "jobs");
    return {
      id,
      displayName: text2(getText(node, "displayName") ?? id),
      implicit: false,
      dependsOn: has(node, "dependsOn") ? list(get(node, "dependsOn")) : previous ? [previous] : [],
      condition: this.condition(node),
      variables,
      jobs: isPSeq(jobsNode) ? this.jobs(jobsNode.items, id, get(node, "pool") ?? rootPool, stageVars, false) : [],
      src: node.src
    };
  }
  jobs(nodes, stageId, inheritedPool, vars, rootIsJob) {
    const jobs = [];
    nodes.forEach((node, index) => {
      if (!isPMap(node)) return this.warn("A job must be a mapping.", node.src, "error");
      const isDeployment = has(node, "deployment");
      const name = (isDeployment ? getText(node, "deployment") : getText(node, "job")) || (nodes.length === 1 ? "Job" : `Job${index + 1}`);
      const variables = rootIsJob ? [] : readVariables(get(node, "variables"));
      const strategy = get(node, "strategy");
      let legs = [void 0];
      if (!isDeployment && isPMap(strategy)) {
        const matrix = get(strategy, "matrix");
        const parallel = num(get(strategy, "parallel"));
        if (isPMap(matrix) && matrix.entries.length > 0) {
          legs = matrix.entries.map((entry) => ({ name: entry.key.text, variables: record(entry.value) }));
        } else if (isPScalar(matrix) && matrix.text) {
          this.warn("This matrix is computed at run time and cannot be expanded locally; the job is shown as a single leg.", matrix.src);
        } else if (parallel && parallel > 1) {
          legs = Array.from({ length: parallel }, (_, i) => ({
            name: `Job${i + 1}`,
            variables: { "System.JobPositionInPhase": String(i + 1), "System.TotalJobsInPhase": String(parallel) }
          }));
        }
      }
      for (const leg of legs) {
        const jobVars = { ...this.known(vars, variables), ...leg?.variables ?? {} };
        const text2 = (value) => expandMacros(value, (n) => lookupCI(jobVars, n));
        const displayName = text2(getText(node, "displayName") ?? name);
        const stepNodes = [];
        if (isDeployment) {
          const kind = ["runOnce", "rolling", "canary"].find((k) => has(strategy, k));
          const body = kind ? get(strategy, kind) : void 0;
          if (!body) this.warn(`Deployment job '${name}' has no runOnce, rolling or canary strategy.`, node.src, "error");
          for (const hook of LIFECYCLE_HOOKS) {
            const steps = get(get(body, hook), "steps");
            if (isPSeq(steps)) stepNodes.push(...steps.items.map((s) => ({ node: s })));
          }
          for (const [outcome, condition] of [["failure", "failed()"], ["success", "succeeded()"]]) {
            const steps = get(get(get(body, "on"), outcome), "steps");
            if (isPSeq(steps)) stepNodes.push(...steps.items.map((s) => ({ node: s, condition })));
          }
        } else {
          const steps = get(node, "steps");
          if (isPSeq(steps)) stepNodes.push(...steps.items.map((s) => ({ node: s })));
        }
        const environment = get(node, "environment");
        const job = {
          id: [stageId, name, leg?.name].filter(Boolean).join("."),
          name,
          stageId,
          displayName: leg ? `${displayName} ${leg.name}` : displayName,
          kind: isDeployment ? "deployment" : "job",
          dependsOn: list(get(node, "dependsOn")),
          condition: this.condition(node),
          pool: this.pool(get(node, "pool") ?? inheritedPool, text2),
          container: this.containerRef(get(node, "container"), text2),
          matrixLeg: leg,
          maxParallel: num(get(strategy, "maxParallel")),
          services: this.services(get(node, "services"), text2),
          variables,
          steps: this.steps(stepNodes, isDeployment, text2, node.src),
          timeoutInMinutes: num(get(node, "timeoutInMinutes")),
          continueOnError: bool(get(node, "continueOnError"), false),
          environment: isPScalar(environment) ? text2(environment.text) : getText(environment, "name"),
          src: node.src
        };
        jobs.push(job);
      }
    });
    return jobs;
  }
  pool(node, text2) {
    if (node === void 0) return { kind: "none", label: "" };
    if (isPScalar(node)) {
      const name2 = text2(node.text);
      if (name2.toLowerCase() === "server") return { kind: "server", label: "server" };
      return name2 ? { kind: "named", name: name2, label: name2 } : { kind: "none", label: "" };
    }
    const vmImage = getText(node, "vmImage");
    const name = getText(node, "name");
    if (vmImage) return { kind: "hosted", vmImage: text2(vmImage), label: text2(vmImage) };
    if (name) return { kind: "named", name: text2(name), label: text2(name) };
    return { kind: "none", label: "" };
  }
  containerSpec(node) {
    if (!isPMap(node)) return void 0;
    const image = getText(node, "image");
    if (!image) return void 0;
    return {
      image,
      env: has(node, "env") ? record(get(node, "env")) : void 0,
      ports: has(node, "ports") ? list(get(node, "ports")) : void 0,
      volumes: has(node, "volumes") ? list(get(node, "volumes")) : void 0,
      options: getText(node, "options")
    };
  }
  containerRef(node, text2) {
    if (node === void 0) return void 0;
    if (isPScalar(node)) {
      const ref = text2(node.text);
      if (!ref) return void 0;
      return this.containers[ref] ?? { image: ref };
    }
    const spec = this.containerSpec(node);
    return spec ? { ...spec, image: text2(spec.image) } : void 0;
  }
  services(node, text2) {
    const out = {};
    if (!isPMap(node)) return out;
    for (const entry of node.entries) {
      const spec = this.containerRef(entry.value, text2);
      if (spec) out[entry.key.text] = spec;
      else this.warn(`Service '${entry.key.text}' does not name a container.`, entry.key.src, "error");
    }
    return out;
  }
  steps(nodes, isDeployment, text2, jobSrc) {
    const steps = [];
    const used = /* @__PURE__ */ new Set();
    let n = 0;
    for (const { node, condition } of nodes) {
      n++;
      if (!isPMap(node)) {
        this.warn("A step must be a mapping.", node.src, "error");
        continue;
      }
      const run = this.stepRun(node);
      if (!run) continue;
      const refName = getText(node, "name");
      let id = refName || `step${n}`;
      if (refName && used.has(id) && !isDeployment) this.warn(`Step name '${refName}' is used more than once in this job; step names must be unique.`, get(node, "name").src, "error", "duplicate-step-name");
      while (used.has(id)) id = `${id}_${n}`;
      used.add(id);
      steps.push({
        id,
        refName,
        displayName: text2(getText(node, "displayName") ?? defaultDisplayName(run)),
        run,
        condition: this.condition(node, condition),
        continueOnError: bool(get(node, "continueOnError"), false),
        enabled: bool(get(node, "enabled"), true),
        env: record(get(node, "env")),
        workingDirectory: getText(node, "workingDirectory"),
        failOnStderr: has(node, "failOnStderr") ? bool(get(node, "failOnStderr"), false) : void 0,
        timeoutInMinutes: num(get(node, "timeoutInMinutes")),
        retryCount: num(get(node, "retryCountOnTaskFailure")),
        src: node.src
      });
    }
    const first = jobSrc;
    if (isDeployment) {
      if (!steps.some((s) => s.run.kind === "download")) {
        steps.unshift({
          ...implicitStep("download", "Download artifacts", first),
          run: { kind: "download", source: "current", artifact: "" }
        });
      }
    } else if (!steps.some((s) => s.run.kind === "checkout")) {
      steps.unshift({ ...implicitStep("checkout", "Checkout", first), run: { kind: "checkout", repository: "self" } });
    }
    return steps;
  }
  stepRun(node) {
    const key = STEP_KEYS2.find((k) => has(node, k));
    const value = key ? getText(node, key) ?? "" : "";
    switch (key) {
      case "script":
        return { kind: "script", shell: "default", script: value };
      case "bash":
        return { kind: "script", shell: "bash", script: value };
      case "pwsh":
        return { kind: "script", shell: "pwsh", script: value };
      case "powershell":
        return { kind: "script", shell: "powershell", script: value };
      case "checkout":
        return { kind: "checkout", repository: value || "self", fetchDepth: num(get(node, "fetchDepth")) };
      case "download":
        return { kind: "download", source: value || "current", artifact: getText(node, "artifact") ?? "", patterns: getText(node, "patterns") };
      case "publish":
        return { kind: "publish", path: value, artifact: getText(node, "artifact") ?? "" };
      case "task": {
        const at = value.lastIndexOf("@");
        const name = at > 0 ? value.slice(0, at) : value;
        const version = at > 0 ? value.slice(at + 1) : "";
        if (!name) {
          this.warn("A 'task:' step needs a task name such as CmdLine@2.", node.src, "error");
          return void 0;
        }
        if (!version) this.warn(`Task '${name}' has no version (expected ${name}@<major>).`, node.src);
        const inputs = record(get(node, "inputs"));
        const { tier, reason } = classifyTask(name, inputs);
        return { kind: "task", name, version, inputs, tier, tierReason: reason, override: taskOverride(this.config, name, version) };
      }
      case "template":
        this.warn(`Template '${value}' could not be included here.`, node.src, "error");
        return void 0;
      case "downloadBuild":
      case "getPackage":
      case "reviewApp":
        return {
          kind: "task",
          name: key,
          version: "",
          inputs: record(node),
          tier: 3,
          tierReason: `'${key}' needs data that only the Azure DevOps server has.`,
          override: taskOverride(this.config, key, "")
        };
      default: {
        const typo = node.entries.map((e) => ({ key: e.key.text, near: suggest(e.key.text, STEP_KEYS2) })).find((e) => e.near);
        this.warn(`Unrecognised step.${typo ? ` '${typo.key}' looks like a misspelling of '${typo.near}'.` : ""} Expected one of: ${STEP_KEYS2.slice(0, 8).join(", ")}.`, node.src, "error");
        return void 0;
      }
    }
  }
};
function implicitStep(id, displayName, src) {
  return { id, displayName, condition: DEFAULT_CONDITION, continueOnError: false, enabled: true, env: {}, implicit: true, src };
}
function defaultDisplayName(run) {
  switch (run.kind) {
    case "script":
      return run.shell === "default" ? "CmdLine" : run.shell === "bash" ? "Bash" : "PowerShell";
    case "task":
      return run.name;
    case "checkout":
      return `Checkout ${run.repository}`;
    case "download":
      return run.source === "none" ? "Download (none)" : `Download ${run.artifact || "artifacts"}`;
    case "publish":
      return `Publish ${run.artifact || "artifact"}`;
  }
}
function lookupCI(vars, name) {
  if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
  const lower = name.toLowerCase();
  const key = Object.keys(vars).find((k) => k.toLowerCase() === lower);
  return key === void 0 ? void 0 : vars[key];
}
function loadPipeline(file, opts) {
  const config = opts.config ?? emptyConfig();
  const absolute = path4.resolve(opts.workspaceRoot, file);
  const base = staticVariables(opts.workspaceRoot, absolute, { ...config.variables, ...opts.variables ?? {} });
  const expand = expandPipeline(absolute, {
    workspaceRoot: opts.workspaceRoot,
    readFile: opts.readFile ?? defaultReadFile,
    repositories: config.repositories,
    parameters: { ...config.parameters, ...opts.parameters ?? {} },
    variables: base
  });
  if (!expand.root) {
    return {
      expanded: null,
      staticVariables: base,
      pipeline: {
        file: absolute,
        triggers: { schedules: [] },
        parameters: expand.parameters,
        parameterValues: expand.parameterValues,
        variables: [],
        stages: [],
        files: expand.files,
        diagnostics: expand.diagnostics
      }
    };
  }
  const builder = new Builder(config, base);
  return { pipeline: builder.build(expand.root, absolute, expand), expanded: expand.root, staticVariables: base };
}

// packages/core/src/conditions.ts
function statusOf(result) {
  switch (result) {
    case "succeeded":
      return "Succeeded";
    case "succeededWithIssues":
    case "succeededWithGaps":
      return "SucceededWithIssues";
    case "failed":
      return "Failed";
    case "canceled":
      return "Canceled";
    // A job that could not run locally did not succeed, so what depends on it does not run either.
    case "skipped":
    case "unsupported":
      return "Skipped";
  }
}
var ok = (status) => status === "Succeeded" || status === "SucceededWithIssues";
function aggregate(statuses) {
  if (statuses.length === 0) return "Succeeded";
  if (statuses.includes("Failed")) return "Failed";
  if (statuses.includes("Canceled")) return "Canceled";
  if (statuses.every((s) => s === "Skipped")) return "Skipped";
  if (statuses.includes("SucceededWithIssues")) return "SucceededWithIssues";
  return "Succeeded";
}
var RunState = class {
  constructor(pipeline2) {
    this.pipeline = pipeline2;
  }
  pipeline;
  jobs = /* @__PURE__ */ new Map();
  canceled = false;
  legs(stageId, jobName) {
    const stage = this.pipeline.stages.find((s) => s.id === stageId);
    return stage ? stage.jobs.filter((j) => j.name === jobName) : [];
  }
  /** Status of a job name, combined over its matrix legs. Undefined until every leg has a result. */
  jobStatus(stageId, jobName) {
    const states = this.legs(stageId, jobName).map((j) => this.jobs.get(j.id));
    if (states.length === 0 || states.some((s) => !s)) return void 0;
    return aggregate(states.map((s) => statusOf(s.result)));
  }
  stageStatus(stageId) {
    const stage = this.pipeline.stages.find((s) => s.id === stageId);
    if (!stage) return void 0;
    const states = stage.jobs.map((j) => this.jobs.get(j.id));
    if (states.some((s) => !s)) return void 0;
    return aggregate(states.map((s) => statusOf(s.result)));
  }
  /** Output variables of a job name: `step.var`, or `leg.step.var` for a matrix. */
  jobOutputs(stageId, jobName) {
    const out = {};
    for (const job of this.legs(stageId, jobName)) {
      for (const [key, value] of Object.entries(this.jobs.get(job.id)?.outputs ?? {})) {
        out[job.matrixLeg ? `${job.matrixLeg.name}.${key}` : key] = value;
        if (job.kind === "deployment") out[`${job.name}.${key}`] = value;
      }
    }
    return out;
  }
};
function variablesContext(get3, missing = "null") {
  return new Resolver((name) => {
    const value = get3(name);
    if (value === void 0) return missing === "null" ? null : new Unknown(`variable '${name}' is not known before the run`);
    return value;
  });
}
function transitiveDeps(stage, job) {
  const seen = /* @__PURE__ */ new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const dep of stage.jobs.find((j) => j.name === name)?.dependsOn ?? []) visit(dep);
  };
  job.dependsOn.forEach(visit);
  return [...seen];
}
function statusFunctions(resolve10, all, canceled) {
  const pick = (args) => (args.length ? args.map((a) => toStr(a)) : all).map(resolve10);
  return {
    succeeded: (args) => pick(args).every(ok),
    failed: (args) => pick(args).some((s) => s === "Failed"),
    succeededOrFailed: (args) => pick(args).every((s) => ok(s) || s === "Failed"),
    always: () => true,
    canceled: () => canceled
  };
}
function toVerdict(value) {
  return value instanceof Unknown ? value : toBool(value);
}
function stageDependencies(stage, state) {
  const out = {};
  for (const dep of stage.dependsOn) {
    const upstream = state.pipeline.stages.find((s) => s.id === dep);
    if (!upstream) continue;
    const entry = { result: state.stageStatus(dep) ?? null };
    const flat = {};
    for (const name of new Set(upstream.jobs.map((j) => j.name))) {
      const outputs = state.jobOutputs(dep, name);
      entry[name] = { result: state.jobStatus(dep, name) ?? null, outputs };
      for (const [key, value] of Object.entries(outputs)) flat[`${name}.${key}`] = value;
    }
    entry.outputs = flat;
    out[dep] = entry;
  }
  return out;
}
function jobContext(stage, job, state) {
  const dependencies = {};
  for (const dep of job.dependsOn) {
    dependencies[dep] = { result: state.jobStatus(stage.id, dep) ?? null, outputs: state.jobOutputs(stage.id, dep) };
  }
  return { dependencies, stageDependencies: stageDependencies(stage, state) };
}
function evalStageCondition(stage, state, variables) {
  return toVerdict(
    evaluate(stage.condition || DEFAULT_CONDITION, {
      named: { variables, dependencies: stageDependencies(stage, state) },
      functions: statusFunctions((name) => state.stageStatus(name), stage.dependsOn, state.canceled)
    })
  );
}
function evalJobCondition(stage, job, state, variables) {
  return toVerdict(
    evaluate(job.condition || DEFAULT_CONDITION, {
      named: { variables, ...jobContext(stage, job, state) },
      functions: statusFunctions((name) => state.jobStatus(stage.id, name), transitiveDeps(stage, job), state.canceled)
    })
  );
}
function evalStepCondition(condition, jobStatus, variables, canceled) {
  return toVerdict(
    evaluate(condition || DEFAULT_CONDITION, {
      named: { variables },
      functions: {
        succeeded: () => ok(jobStatus) && !canceled,
        failed: () => jobStatus === "Failed",
        succeededOrFailed: () => !canceled,
        always: () => true,
        canceled: () => canceled
      }
    })
  );
}
function previewCondition(condition, known) {
  const later = () => new Unknown("decided during the run");
  try {
    const value = evaluate(condition || DEFAULT_CONDITION, {
      named: {
        variables: variablesContext(known, "unknown"),
        dependencies: new Resolver(later),
        stageDependencies: new Resolver(later)
      },
      functions: {
        succeeded: (args) => args.length ? later() : true,
        succeededOrFailed: (args) => args.length ? later() : true,
        always: () => true,
        failed: later,
        canceled: later
      }
    });
    if (value instanceof Unknown) return "depends";
    return toBool(value) ? "runs" : "skipped";
  } catch (err) {
    if (err instanceof ExprError) return "depends";
    throw err;
  }
}
function evalRuntimeValue(text2, ctx) {
  const m = /^\s*\$\[([\s\S]*)\]\s*$/.exec(text2);
  if (!m) return text2;
  const value = evaluate(m[1].trim(), ctx);
  return value instanceof Unknown ? value : toStr(value);
}

// packages/core/src/planner.ts
var passed = (record2) => {
  const status = record2 && statusOf(record2.result);
  return status === "Succeeded" || status === "SucceededWithIssues";
};
function upstreamStages(pipeline2, stage, into = /* @__PURE__ */ new Set()) {
  for (const dep of stage.dependsOn) {
    if (into.has(dep)) continue;
    into.add(dep);
    const upstream = pipeline2.stages.find((s) => s.id === dep);
    if (upstream) upstreamStages(pipeline2, upstream, into);
  }
  return into;
}
function downstreamStages(pipeline2, stageId) {
  const out = /* @__PURE__ */ new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const stage of pipeline2.stages) {
      if (!out.has(stage.id) && stage.dependsOn.some((dep) => dep === stageId || out.has(dep))) {
        out.add(stage.id);
        grew = true;
      }
    }
  }
  return out;
}
function matchesJob(job, wanted) {
  return job.id === wanted || `${job.stageId}.${job.name}` === wanted;
}
function createPlan(pipeline2, selection, opts) {
  const all = pipeline2.stages.flatMap((stage) => stage.jobs);
  const stageOf = (job) => pipeline2.stages.find((s) => s.id === job.stageId);
  const selected = /* @__PURE__ */ new Set();
  const reuse = /* @__PURE__ */ new Map();
  let untilStepId;
  switch (selection.kind) {
    case "pipeline":
      all.forEach((job) => selected.add(job.id));
      break;
    case "stage": {
      const stages = /* @__PURE__ */ new Set([selection.stageId, ...selection.andLater ? downstreamStages(pipeline2, selection.stageId) : []]);
      all.filter((job) => stages.has(job.stageId)).forEach((job) => selected.add(job.id));
      break;
    }
    case "job":
      all.filter((job) => matchesJob(job, selection.jobId)).forEach((job) => selected.add(job.id));
      break;
    case "step":
      all.filter((job) => matchesJob(job, selection.jobId)).forEach((job) => selected.add(job.id));
      untilStepId = selection.stepId;
      break;
    case "failed":
      for (const job of all) {
        const record2 = opts.history?.fromRun(selection.runId, job.id);
        if (passed(record2)) reuse.set(job.id, record2);
        else selected.add(job.id);
      }
      break;
  }
  const needed = /* @__PURE__ */ new Set();
  const visit = (job) => {
    const stage = stageOf(job);
    for (const dep of job.dependsOn) {
      for (const other of stage.jobs.filter((j) => j.name === dep)) {
        if (!selected.has(other.id) && !needed.has(other.id)) {
          needed.add(other.id);
          visit(other);
        }
      }
    }
    for (const upstream of upstreamStages(pipeline2, stage)) {
      for (const other of all.filter((j) => j.stageId === upstream)) {
        if (!selected.has(other.id) && !needed.has(other.id)) needed.add(other.id);
      }
    }
  };
  all.filter((job) => selected.has(job.id)).forEach(visit);
  const jobs = all.map((job) => {
    if (selected.has(job.id)) {
      return { job, action: "run", reason: selection.kind === "failed" ? "did not pass in the earlier run" : "selected", untilStepId };
    }
    const kept = reuse.get(job.id);
    if (kept) return { job, action: "reuse", reason: `passed in run ${kept.runId}`, reused: kept };
    if (needed.has(job.id)) {
      const record2 = opts.history?.lastSuccessful(pipeline2.file, job.id);
      if (record2) return { job, action: "reuse", reason: `needed by the selection; result reused from run ${record2.runId}`, reused: record2 };
      return { job, action: "run", reason: "needed by the selection; no earlier result to reuse" };
    }
    return { job, action: "omit", reason: "not selected" };
  });
  return { pipeline: pipeline2, selection, jobs, variables: opts.variables ?? {}, buildId: opts.buildId, buildNumber: opts.buildNumber };
}
function selectByName(pipeline2, names) {
  const jobs = pipeline2.stages.flatMap((s) => s.jobs);
  const jobId = (name) => {
    if (jobs.some((j) => matchesJob(j, name))) return name;
    const [base, leg] = name.split(".");
    const match = jobs.find((j) => j.name.toLowerCase() === base.toLowerCase() && (!leg || j.matrixLeg?.name.toLowerCase() === leg.toLowerCase()));
    if (!match) throw new Error(`No job named '${name}'. Jobs: ${[...new Set(jobs.map((j) => j.name))].join(", ")}`);
    return leg ? match.id : `${match.stageId}.${match.name}`;
  };
  const stageId = (name) => {
    const match = pipeline2.stages.find((s) => s.id.toLowerCase() === name.toLowerCase());
    if (!match) throw new Error(`No stage named '${name}'. Stages: ${pipeline2.stages.map((s) => s.id).join(", ")}`);
    return match.id;
  };
  if (names.step) {
    const [jobName, ...rest] = names.step.split(":");
    const id = jobId(jobName);
    const wanted = rest.join(":").toLowerCase();
    const job = jobs.find((j) => matchesJob(j, id));
    const step = job.steps.find((s) => s.id.toLowerCase() === wanted || s.displayName.toLowerCase() === wanted);
    if (!step) throw new Error(`No step '${rest.join(":")}' in job ${jobName}. Steps: ${job.steps.map((s) => `${s.id} (${s.displayName})`).join(", ")}`);
    return { kind: "step", jobId: id, stepId: step.id };
  }
  if (names.job) return { kind: "job", jobId: jobId(names.job) };
  if (names.stage) return { kind: "stage", stageId: stageId(names.stage) };
  if (names.fromStage) return { kind: "stage", stageId: stageId(names.fromStage), andLater: true };
  return { kind: "pipeline" };
}
function describeSelection(pipeline2, selection) {
  const jobName = (id) => pipeline2.stages.flatMap((s) => s.jobs).find((j) => matchesJob(j, id))?.name ?? id;
  switch (selection.kind) {
    case "pipeline":
      return "whole pipeline";
    case "stage":
      return selection.andLater ? `from stage ${selection.stageId}` : `stage ${selection.stageId}`;
    case "job":
      return `job ${jobName(selection.jobId)}`;
    case "step":
      return `job ${jobName(selection.jobId)} up to step ${selection.stepId}`;
    case "failed":
      return `failed jobs of run ${selection.runId}`;
  }
}

// packages/core/src/targets.ts
var BUILT_IN_IMAGE = "azp-local/agent-ubuntu";
var DEFAULT_UBUNTU = "24.04";
function ubuntuRelease(label) {
  const m = /^ubuntu-(latest|\d\d\.\d\d)$/i.exec(label);
  if (!m) return void 0;
  return m[1].toLowerCase() === "latest" ? DEFAULT_UBUNTU : m[1];
}
function configured(config, label) {
  const key = Object.keys(config.images).find((k) => k.toLowerCase() === label.toLowerCase());
  return key ? config.images[key] : void 0;
}
function resolveTarget(job, config, platform = process.platform) {
  if (job.pool.kind === "server") {
    return { kind: "unsupported", reason: "Agentless (server) jobs run inside Azure DevOps and have no local equivalent." };
  }
  if (job.container) return { kind: "container", image: job.container.image, source: "container-job" };
  const label = job.pool.label || "ubuntu-latest";
  const mapped = configured(config, label);
  if (mapped !== void 0) {
    if (mapped.toLowerCase() !== "host") return { kind: "container", image: mapped, source: "config" };
    const wantsWindows = /^windows/i.test(label);
    const wantsMac = /^macos/i.test(label);
    if (wantsWindows && platform !== "win32" || wantsMac && platform !== "darwin") {
      return { kind: "unsupported", reason: `'${label}' is mapped to host, but this machine is not ${wantsWindows ? "Windows" : "macOS"}.` };
    }
    return { kind: "host", note: "Runs directly on this machine in a scratch folder. Not isolated." };
  }
  const release2 = ubuntuRelease(label);
  if (release2) return { kind: "container", image: `${BUILT_IN_IMAGE}:${release2}`, builtIn: release2, source: "default" };
  if (/^windows/i.test(label)) {
    return {
      kind: "unsupported",
      reason: `Windows jobs need host mode. Add 'images: { ${label}: host }' to .azp-local.yml on a Windows machine to run them unisolated.`
    };
  }
  if (/^macos/i.test(label)) {
    return { kind: "unsupported", reason: "macOS jobs cannot run in a container. They can be mapped to host on a Mac." };
  }
  return {
    kind: "unsupported",
    reason: `No image is mapped for pool '${label}'. Add it under 'images:' in .azp-local.yml.`
  };
}
function describeTarget(target) {
  if (target.kind === "container") return target.image;
  if (target.kind === "host") return "host (not isolated)";
  return "not runnable locally";
}

// packages/core/src/graph.ts
var path5 = __toESM(require("node:path"), 1);
function stepKind(step) {
  switch (step.run.kind) {
    case "script":
      return step.run.shell === "default" ? "script" : step.run.shell;
    case "task":
      return step.run.version ? `${step.run.name}@${step.run.version}` : step.run.name;
    default:
      return step.run.kind;
  }
}
function overrideText(step) {
  if (step.run.kind !== "task" || !step.run.override) return void 0;
  const o = step.run.override;
  switch (o.action) {
    case "skip":
      return "skipped by .azp-local.yml";
    case "fail":
      return "fails by .azp-local.yml";
    case "script":
      return `replaced by ${o.script}`;
    case "path":
      return `task code from ${o.path}`;
  }
}
function knownVariables(pipeline2, stage, job, base, config) {
  const vars = { ...base };
  for (const decl of [...pipeline2.variables, ...stage.variables, ...job.variables]) {
    if (decl.group) {
      for (const [name, entry] of Object.entries(config.variableGroups[decl.group] ?? {})) {
        if (!entry.secret && entry.value !== void 0) vars[name] = entry.value;
      }
    } else if (!decl.value.trimStart().startsWith("$[")) {
      vars[decl.name] = decl.value;
    }
  }
  Object.assign(vars, job.matrixLeg?.variables ?? {});
  return vars;
}
function buildGraph(pipeline2, base, config, platform = process.platform) {
  const columns = /* @__PURE__ */ new Map();
  const column = (stage, trail = []) => {
    const cached = columns.get(stage.id);
    if (cached !== void 0) return cached;
    if (trail.includes(stage.id)) return 0;
    const deps = stage.dependsOn.map((id) => pipeline2.stages.find((s) => s.id === id)).filter((s) => !!s);
    const value = deps.length ? Math.max(...deps.map((d) => column(d, [...trail, stage.id]))) + 1 : 0;
    columns.set(stage.id, value);
    return value;
  };
  const stages = pipeline2.stages.map((stage) => {
    const stageVars = knownVariables(pipeline2, stage, { variables: [] }, base, config);
    return {
      id: stage.id,
      displayName: stage.displayName,
      implicit: stage.implicit,
      column: column(stage),
      dependsOn: stage.dependsOn,
      condition: stage.condition !== DEFAULT_CONDITION ? stage.condition : void 0,
      preview: stage.condition !== DEFAULT_CONDITION ? previewCondition(stage.condition, (n) => lookupCI(stageVars, n)) : void 0,
      src: stage.src,
      jobs: stage.jobs.map((job) => {
        const vars = knownVariables(pipeline2, stage, job, base, config);
        const known = (name) => lookupCI(vars, name);
        const target = resolveTarget(job, config, platform);
        const tiers = { 1: 0, 2: 0, 3: 0 };
        const steps = job.steps.map((step) => {
          const tier = step.run.kind === "task" ? step.run.tier : 1;
          tiers[tier]++;
          return {
            id: step.id,
            displayName: step.displayName,
            kind: stepKind(step),
            tier,
            tierNote: step.run.kind === "task" ? step.run.tierReason : void 0,
            override: overrideText(step),
            condition: step.condition !== DEFAULT_CONDITION ? step.condition : void 0,
            preview: step.condition !== DEFAULT_CONDITION ? previewCondition(step.condition, known) : void 0,
            enabled: step.enabled,
            implicit: !!step.implicit,
            src: step.src
          };
        });
        return {
          id: job.id,
          name: job.name,
          displayName: job.displayName,
          kind: job.kind,
          leg: job.matrixLeg?.name,
          dependsOn: job.dependsOn.flatMap((dep) => stage.jobs.filter((j) => j.name === dep).map((j) => j.id)),
          condition: job.condition !== DEFAULT_CONDITION ? job.condition : void 0,
          preview: job.condition !== DEFAULT_CONDITION ? previewCondition(job.condition, known) : void 0,
          pool: job.pool.label || "(default pool)",
          target,
          targetLabel: describeTarget(target),
          environment: job.environment,
          services: Object.keys(job.services),
          tiers,
          steps,
          src: job.src
        };
      })
    };
  });
  return {
    title: path5.basename(pipeline2.file),
    runName: pipeline2.name,
    file: pipeline2.file,
    triggers: pipeline2.triggers,
    stages,
    errors: pipeline2.diagnostics.filter((d) => d.severity === "error").length,
    warnings: pipeline2.diagnostics.filter((d) => d.severity === "warning").length
  };
}
function renderGraphText(graph) {
  const lines = [];
  const badge = (condition, preview) => condition ? `  [if ${condition} -> ${preview}]` : "";
  lines.push(`Pipeline ${graph.title}`);
  if (graph.runName) lines.push(`  Run name: ${graph.runName}`);
  lines.push(`  CI trigger: ${graph.triggers.ci ?? "-"}   PR trigger: ${graph.triggers.pr ?? "-"}`);
  for (const schedule of graph.triggers.schedules) lines.push(`  Schedule: ${schedule.cron}${schedule.displayName ? ` (${schedule.displayName})` : ""}`);
  lines.push("  Triggers are shown for information; nothing fires locally.");
  for (const stage of graph.stages) {
    if (!stage.implicit) {
      const after = stage.dependsOn.length ? `  (after ${stage.dependsOn.join(", ")})` : "";
      lines.push("", `Stage ${stage.displayName}${after}${badge(stage.condition, stage.preview)}`);
    } else {
      lines.push("");
    }
    for (const job of stage.jobs) {
      const after = job.dependsOn.length ? `  (after ${job.dependsOn.map((id) => id.split(".").slice(1).join(".")).join(", ")})` : "";
      lines.push(`  ${job.kind === "deployment" ? "Deployment" : "Job"} ${job.displayName}  <${job.pool} -> ${job.targetLabel}>${after}${badge(job.condition, job.preview)}`);
      if (job.target.kind === "unsupported") lines.push(`      ! ${job.target.reason}`);
      for (const step of job.steps) {
        const tier = step.kind.includes("@") ? ` (tier ${step.tier}${step.override ? `, ${step.override}` : ""})` : "";
        const off = step.enabled ? "" : "  [disabled]";
        lines.push(`      - ${step.displayName}  {${step.kind}}${tier}${off}${badge(step.condition, step.preview)}`);
      }
    }
  }
  return lines.join("\n");
}

// packages/core/src/runstore.ts
var fs4 = __toESM(require("node:fs"), 1);
var path6 = __toESM(require("node:path"), 1);
var safe = (name) => name.replace(/[^A-Za-z0-9._-]/g, "_");
var RunStore = class {
  constructor(root) {
    this.root = root;
  }
  root;
  get runsDir() {
    return path6.join(this.root, "runs");
  }
  /** Folder for Cache@2 entries, scoped to this store (one workspace). */
  get cacheDir() {
    return path6.join(this.root, "cache");
  }
  runDir(runId) {
    return path6.join(this.runsDir, safe(runId));
  }
  stepLogPath(runId, jobId, stepId) {
    return path6.join(this.runDir(runId), "logs", safe(jobId), `${safe(stepId)}.log`);
  }
  // --- counters ----------------------------------------------------------------
  readState() {
    try {
      return { buildId: 0, counters: {}, revisions: {}, ...JSON.parse(fs4.readFileSync(path6.join(this.root, "state.json"), "utf8")) };
    } catch {
      return { buildId: 0, counters: {}, revisions: {} };
    }
  }
  writeState(state) {
    fs4.mkdirSync(this.root, { recursive: true });
    fs4.writeFileSync(path6.join(this.root, "state.json"), JSON.stringify(state, null, 2));
  }
  nextBuildId() {
    const state = this.readState();
    state.buildId += 1;
    this.writeState(state);
    return state.buildId;
  }
  /** `counter(prefix, seed)`: starts at the seed and goes up by one each time it is evaluated for a prefix. */
  counter(prefix, seed) {
    const state = this.readState();
    const next = prefix in state.counters ? state.counters[prefix] + 1 : seed;
    state.counters[prefix] = next;
    this.writeState(state);
    return next;
  }
  /** `$(Rev:r)`: one more than the last run whose build number had the same base. */
  revision(base) {
    const state = this.readState();
    const next = (state.revisions[base] ?? 0) + 1;
    state.revisions[base] = next;
    this.writeState(state);
    return next;
  }
  // --- writing -----------------------------------------------------------------
  createRun(plan, engine) {
    const runId = `run-${String(plan.buildId).padStart(4, "0")}`;
    const dir = this.runDir(runId);
    fs4.rmSync(dir, { recursive: true, force: true });
    fs4.mkdirSync(dir, { recursive: true });
    const meta = {
      runId,
      buildId: plan.buildId,
      buildNumber: plan.buildNumber,
      pipelineFile: plan.pipeline.file,
      pipelineName: plan.pipeline.name,
      selection: plan.selection,
      engine,
      startedAt: Date.now()
    };
    fs4.writeFileSync(path6.join(dir, "run.json"), JSON.stringify(meta, null, 2));
    fs4.writeFileSync(path6.join(dir, "pipeline.json"), JSON.stringify(plan.pipeline));
    fs4.writeFileSync(
      path6.join(dir, "plan.json"),
      JSON.stringify(plan.jobs.map((j) => ({ jobId: j.job.id, action: j.action, reason: j.reason, reusedFrom: j.reused?.runId })))
    );
    fs4.writeFileSync(path6.join(dir, "jobs.json"), "{}");
    return { runId, runDir: dir };
  }
  append(runId, event) {
    const dir = this.runDir(runId);
    if (event.type === "log") {
      const file = this.stepLogPath(runId, event.jobId, event.stepId);
      fs4.mkdirSync(path6.dirname(file), { recursive: true });
      fs4.appendFileSync(file, `${new Date(event.at).toISOString()} ${event.line}
`);
      return;
    }
    fs4.appendFileSync(path6.join(dir, "events.jsonl"), `${JSON.stringify(event)}
`);
    if (event.type === "job.finished") {
      const records = this.readJobs(runId);
      const origin = this.readPlan(runId).find((p) => p.jobId === event.jobId)?.reusedFrom ?? runId;
      records[event.jobId] = { runId: origin, jobId: event.jobId, result: event.result, outputs: event.outputs ?? {} };
      fs4.writeFileSync(path6.join(dir, "jobs.json"), JSON.stringify(records, null, 2));
    } else if (event.type === "buildNumber") {
      this.updateMeta(runId, { buildNumber: event.value });
    } else if (event.type === "run.finished") {
      this.updateMeta(runId, { finishedAt: event.at, result: event.result, gaps: event.gaps });
    }
  }
  updateMeta(runId, patch) {
    const meta = this.readMeta(runId);
    if (meta) fs4.writeFileSync(path6.join(this.runDir(runId), "run.json"), JSON.stringify({ ...meta, ...patch }, null, 2));
  }
  // --- reading -----------------------------------------------------------------
  readMeta(runId) {
    try {
      return JSON.parse(fs4.readFileSync(path6.join(this.runDir(runId), "run.json"), "utf8"));
    } catch {
      return void 0;
    }
  }
  readPipeline(runId) {
    try {
      return JSON.parse(fs4.readFileSync(path6.join(this.runDir(runId), "pipeline.json"), "utf8"));
    } catch {
      return void 0;
    }
  }
  readPlan(runId) {
    try {
      return JSON.parse(fs4.readFileSync(path6.join(this.runDir(runId), "plan.json"), "utf8"));
    } catch {
      return [];
    }
  }
  readJobs(runId) {
    try {
      return JSON.parse(fs4.readFileSync(path6.join(this.runDir(runId), "jobs.json"), "utf8"));
    } catch {
      return {};
    }
  }
  readEvents(runId) {
    try {
      return fs4.readFileSync(path6.join(this.runDir(runId), "events.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }
  readStepLog(runId, jobId, stepId) {
    try {
      return fs4.readFileSync(this.stepLogPath(runId, jobId, stepId), "utf8");
    } catch {
      return "";
    }
  }
  /** Newest first. */
  listRuns() {
    let names;
    try {
      names = fs4.readdirSync(this.runsDir);
    } catch {
      return [];
    }
    return names.map((name) => this.readMeta(name)).filter((meta) => !!meta).sort((a, b) => b.startedAt - a.startedAt);
  }
  lastSuccessful(pipelineFile, jobId) {
    for (const meta of this.listRuns()) {
      if (path6.resolve(meta.pipelineFile) !== path6.resolve(pipelineFile)) continue;
      const record2 = this.readJobs(meta.runId)[jobId];
      if (record2 && record2.runId === meta.runId && ["succeeded", "succeededWithIssues", "succeededWithGaps"].includes(record2.result)) {
        return record2;
      }
    }
    return void 0;
  }
  fromRun(runId, jobId) {
    return this.readJobs(runId)[jobId];
  }
  deleteRun(runId) {
    fs4.rmSync(this.runDir(runId), { recursive: true, force: true });
  }
  /** Keeps the newest `keep` runs. Returns how many were removed. */
  prune(keep) {
    const old = this.listRuns().slice(keep);
    old.forEach((meta) => this.deleteRun(meta.runId));
    return old.length;
  }
  sizeBytes() {
    const walk = (dir) => {
      let total = 0;
      let entries;
      try {
        entries = fs4.readdirSync(dir, { withFileTypes: true });
      } catch {
        return 0;
      }
      for (const entry of entries) {
        const full = path6.join(dir, entry.name);
        if (entry.isDirectory()) total += walk(full);
        else {
          try {
            total += fs4.statSync(full).size;
          } catch {
          }
        }
      }
      return total;
    };
    return walk(this.root);
  }
};

// packages/core/src/runview.ts
var RunView = class {
  jobs = /* @__PURE__ */ new Map();
  runId;
  startedAt;
  finishedAt;
  result;
  gaps = [];
  buildNumber;
  tests = [];
  coverage = [];
  artifacts = [];
  summaries = [];
  constructor(plan = []) {
    for (const entry of plan) {
      this.jobs.set(entry.jobId, { id: entry.jobId, state: entry.action === "omit" ? "omitted" : "pending", reused: entry.action === "reuse", steps: [] });
    }
  }
  get running() {
    return this.startedAt !== void 0 && this.finishedAt === void 0;
  }
  job(jobId) {
    let job = this.jobs.get(jobId);
    if (!job) {
      job = { id: jobId, state: "pending", reused: false, steps: [] };
      this.jobs.set(jobId, job);
    }
    return job;
  }
  step(jobId, stepId) {
    const job = this.job(jobId);
    let step = job.steps.find((s) => s.id === stepId);
    if (!step) {
      step = { id: stepId, state: "pending", issues: [] };
      job.steps.push(step);
    }
    return step;
  }
  apply(event) {
    switch (event.type) {
      case "run.started":
        this.runId = event.runId;
        this.startedAt = event.at;
        break;
      case "job.started": {
        const job = this.job(event.jobId);
        job.state = "running";
        job.image = event.image;
        job.startedAt = event.at;
        break;
      }
      case "step.started": {
        const step = this.step(event.jobId, event.stepId);
        step.state = "running";
        step.startedAt = event.at;
        if (event.displayName) step.displayName = event.displayName;
        break;
      }
      case "issue":
        this.step(event.jobId, event.stepId).issues.push({ severity: event.severity, message: event.message, source: event.source });
        break;
      case "step.finished": {
        const step = this.step(event.jobId, event.stepId);
        step.state = event.result;
        step.finishedAt = event.at;
        step.message = event.message;
        break;
      }
      case "job.finished": {
        const job = this.job(event.jobId);
        job.state = event.result;
        job.finishedAt = event.at;
        job.message = event.message;
        job.container = event.container;
        break;
      }
      case "artifact":
        this.artifacts.push({ jobId: event.jobId, name: event.name, path: event.path, files: event.files });
        break;
      case "summary":
        this.summaries.push({ jobId: event.jobId, name: event.name, path: event.path });
        break;
      case "tests":
        this.tests.push({ jobId: event.jobId, summary: event.summary });
        break;
      case "coverage":
        this.coverage.push({ jobId: event.jobId, summary: event.summary });
        break;
      case "buildNumber":
        this.buildNumber = event.value;
        break;
      case "run.finished":
        this.finishedAt = event.at;
        this.result = event.result;
        this.gaps = event.gaps;
        break;
      case "log":
      case "variable.set":
        break;
    }
  }
};
function formatDuration(ms) {
  if (ms === void 0 || ms < 0) return "";
  if (ms < 1e3) return `${ms}ms`;
  const seconds = Math.round(ms / 1e3);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
function resultLabel(result) {
  switch (result) {
    case "succeeded":
      return "succeeded";
    case "succeededWithIssues":
      return "succeeded with issues";
    case "succeededWithGaps":
      return "succeeded with gaps";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    case "skipped":
      return "skipped";
    case "unsupported":
      return "not run locally";
    case "running":
      return "running";
    case "omitted":
      return "not selected";
    default:
      return "pending";
  }
}

// packages/core/src/isolation.ts
var crypto = __toESM(require("node:crypto"), 1);
var path7 = __toESM(require("node:path"), 1);
var outside = (root, target) => {
  const rel = path7.relative(path7.resolve(root), path7.resolve(root, target));
  return rel === ".." || rel.startsWith(`..${path7.sep}`) || path7.isAbsolute(rel);
};
function isolationRisks(plan, config, workspaceRoot, platform = process.platform) {
  const risks = /* @__PURE__ */ new Map();
  const add = (risk) => risks.set(risk.detail, risk);
  const jobs = plan.jobs.filter((pj) => pj.action === "run").map((pj) => pj.job);
  let containerJobs = 0;
  for (const job of jobs) {
    const target = resolveTarget(job, config, platform);
    if (target.kind === "container") containerJobs++;
    if (target.kind === "host") {
      const label = job.pool.label || "(default pool)";
      add({
        kind: "host",
        detail: `host:${label.toLowerCase()}`,
        message: `Pool '${label}' is mapped to host: its jobs run directly on this machine, not in a container, and can read and change any of your files.`
      });
    }
    for (const step of job.steps) {
      const run = step.run;
      if (run.kind === "checkout" && run.repository !== "self" && run.repository !== "none") {
        const alias = Object.keys(config.repositories).find((a) => a.toLowerCase() === run.repository.toLowerCase());
        const mapped = alias ? config.repositories[alias] : void 0;
        if (mapped !== void 0 && outside(workspaceRoot, mapped)) {
          const abs = path7.resolve(workspaceRoot, mapped);
          add({ kind: "outsidePath", detail: `repository:${alias.toLowerCase()}=${abs}`, message: `Repository '${alias}' is mapped to ${abs}, outside this repository: its checkout copies that folder into the job.` });
        }
      }
      if (run.kind === "task" && run.override && (run.override.action === "path" || run.override.action === "script")) {
        const ref = run.override.action === "path" ? run.override.path : run.override.script;
        if (outside(workspaceRoot, ref)) {
          const abs = path7.resolve(workspaceRoot, ref);
          const what = run.override.action === "path" ? "task folder" : "replacement script";
          add({ kind: "outsidePath", detail: `task:${run.override.action}=${abs}`, message: `The ${what} ${abs} is outside this repository: it is copied into the job.` });
        }
      }
    }
  }
  if (containerJobs > 0 && config.dockerSocket) {
    add({ kind: "dockerSocket", detail: "dockerSocket", message: "dockerSocket: true gives jobs control of Docker on this machine, which is equivalent to administrator rights on it." });
  }
  if (containerJobs > 0 && config.workspace === "mount") {
    add({
      kind: "mount",
      detail: `mount:${path7.resolve(workspaceRoot)}`,
      message: `workspace: mount gives jobs write access to ${path7.resolve(workspaceRoot)} itself, ignored files such as .env included, instead of a copy.`
    });
  }
  return [...risks.values()].sort((a, b) => a.detail.localeCompare(b.detail));
}
function isolationFingerprint(risks) {
  const text2 = risks.map((r) => r.detail).sort().join("\n");
  return crypto.createHash("sha256").update(text2).digest("hex");
}

// packages/core/src/session.ts
var ISOLATION_DECLINED = "Not run: .azp-local.yml weakens isolation for this run and that was not approved.";
function startRun(args) {
  const { engine, plan, store } = args;
  const risks = isolationRisks(plan, args.config, args.workspaceRoot);
  const { runId, runDir } = store.createRun(plan, engine.id);
  let handle;
  let canceled = false;
  const record2 = (event) => {
    store.append(runId, event);
    try {
      args.onEvent?.(event);
    } catch {
    }
  };
  const done = (async () => {
    const approved = risks.length === 0 || !canceled && await args.hooks.approveIsolation(risks, isolationFingerprint(risks)).catch(() => false);
    if (!approved || canceled) {
      const at = Date.now();
      const message = canceled ? "The run was canceled before it started." : ISOLATION_DECLINED;
      const gaps = canceled ? [] : [ISOLATION_DECLINED, ...risks.map((r) => r.message)];
      record2({ type: "run.started", runId, at });
      for (const pj of plan.jobs) if (pj.action === "run") record2({ type: "job.finished", jobId: pj.job.id, result: "canceled", message, at });
      record2({ type: "run.finished", result: "canceled", gaps, at });
      return { result: "canceled", gaps };
    }
    handle = engine.start(plan, {
      runId,
      runDir,
      workspaceRoot: args.workspaceRoot,
      config: args.config,
      getSecret: args.hooks.getSecret,
      confirm: args.hooks.confirm,
      resolveRunDir: (id) => store.runDir(id)
    });
    let outcome = { result: "failed", gaps: [] };
    for await (const event of handle.events) {
      record2(event);
      if (event.type === "run.finished") outcome = { result: event.result, gaps: event.gaps };
    }
    return outcome;
  })();
  return {
    runId,
    runDir,
    cancel: async () => {
      canceled = true;
      await handle?.cancel();
    },
    done
  };
}

// packages/core/src/discovery.ts
var fs5 = __toESM(require("node:fs"), 1);
var path8 = __toESM(require("node:path"), 1);
var SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "coverage", ".vscode-test", "vendor", "target", "obj", ".venv", "venv"]);
var BODY_KEYS = ["stages", "jobs", "steps", "extends"];
var FOREIGN_KEYS = ["apiVersion", "kind", "on", "services", "version", "openapi", "swagger"];
function topLevelKeys(text2) {
  const keys = /* @__PURE__ */ new Map();
  const lines = text2.split(/\r?\n/);
  lines.forEach((line, index) => {
    const m = /^(['"]?)([A-Za-z_][\w-]*)\1\s*:/.exec(line);
    if (m && !keys.has(m[2])) keys.set(m[2], index);
  });
  return keys;
}
function hasPipelineName(file) {
  return /^\.?azure-pipelines(?:[-.][\w.-]*)?\.ya?ml$/i.test(path8.basename(file)) || /^\.?vsts-ci\.ya?ml$/i.test(path8.basename(file));
}
function looksLikePipeline(text2) {
  const keys = topLevelKeys(text2);
  const body = BODY_KEYS.filter((key) => keys.has(key));
  if (body.length === 0) return false;
  if (FOREIGN_KEYS.some((key) => keys.has(key)) && !keys.has("pool") && !keys.has("trigger")) return false;
  if (body.includes("extends")) return true;
  const lines = text2.split(/\r?\n/);
  return body.some((key) => {
    const start = keys.get(key);
    const inline = lines[start].slice(lines[start].indexOf(":") + 1).trim();
    if (inline.startsWith("[") || inline.startsWith("${{")) return true;
    for (let i = start + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      return trimmed.startsWith("-") || trimmed.startsWith("${{");
    }
    return false;
  });
}
function referencedTemplates(text2, file, workspaceRoot) {
  const out = [];
  const re = /^\s*-?\s*template\s*:\s*['"]?([^'"#\s]+)/gm;
  let m;
  while (m = re.exec(text2)) {
    let ref = m[1];
    const at = ref.lastIndexOf("@");
    if (at > 0) {
      if (ref.slice(at + 1) !== "self") continue;
      ref = ref.slice(0, at);
    }
    out.push(ref.startsWith("/") ? path8.join(workspaceRoot, ref) : path8.resolve(path8.dirname(file), ref));
  }
  return out;
}
function discoverPipelines(workspaceRoot, config, readFile = (file) => {
  try {
    return fs5.readFileSync(file, "utf8");
  } catch {
    return void 0;
  }
}) {
  const yamlFiles = [];
  const walk = (dir, depth) => {
    if (depth > 8 || yamlFiles.length > 3e3) return;
    let entries;
    try {
      entries = fs5.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path8.join(dir, entry.name), depth + 1);
      } else if (/\.ya?ml$/i.test(entry.name) && entry.name !== ".azp-local.yml") {
        yamlFiles.push(path8.join(dir, entry.name));
      }
    }
  };
  walk(workspaceRoot, 0);
  const listed = new Set(config.pipelines.map((p) => path8.resolve(workspaceRoot, p)));
  const candidates = new Set(listed);
  const referenced = /* @__PURE__ */ new Set();
  for (const file of yamlFiles) {
    const text2 = readFile(file);
    if (text2 === void 0) continue;
    if (!looksLikePipeline(text2)) {
      if (hasPipelineName(file)) candidates.add(file);
      continue;
    }
    candidates.add(file);
    referencedTemplates(text2, file, workspaceRoot).forEach((ref) => referenced.add(path8.normalize(ref)));
  }
  const pipelines = [...candidates].filter((file) => listed.has(file) || !referenced.has(path8.normalize(file))).sort();
  const templates = [...referenced].filter((file) => ![...listed].some((l) => path8.normalize(l) === file) && readFile(file) !== void 0).sort();
  return { pipelines, templates };
}

// packages/core/src/doctor.ts
function analysePipelines(pipelines, config, platform = process.platform) {
  const findings = [];
  if (!config.file) {
    findings.push({ level: "info", area: "Config", message: "No .azp-local.yml. Defaults apply; a self-contained pipeline needs none." });
  } else if (config.diagnostics.length === 0) {
    findings.push({ level: "ok", area: "Config", message: `${config.file} is valid.` });
  }
  for (const d of config.diagnostics) {
    findings.push({ level: d.severity === "error" ? "error" : "warning", area: "Config", message: `${d.message} (${describeSource(d.source)})` });
  }
  if (config.dockerSocket) {
    findings.push({
      level: "warning",
      area: "Security",
      message: "dockerSocket is enabled: steps can control Docker on this machine, which is equivalent to root on the host."
    });
  }
  for (const pipeline2 of pipelines) {
    const errors = pipeline2.diagnostics.filter((d) => d.severity === "error");
    for (const d of errors) findings.push({ level: "error", area: "Expansion", message: `${d.message} (${describeSource(d.source)})` });
    const jobs = pipeline2.stages.flatMap((s) => s.jobs);
    const pools = /* @__PURE__ */ new Map();
    for (const job of jobs) {
      const label = job.container ? `container ${job.container.image}` : job.pool.label || "(default pool)";
      pools.set(label, [...pools.get(label) ?? [], job.id]);
    }
    const seenPool = /* @__PURE__ */ new Set();
    for (const job of jobs) {
      const label = job.container ? `container ${job.container.image}` : job.pool.label || "(default pool)";
      if (seenPool.has(label)) continue;
      seenPool.add(label);
      const target = resolveTarget(job, config, platform);
      const count = pools.get(label).length;
      const where = `${count} job${count === 1 ? "" : "s"}`;
      if (target.kind === "container") {
        findings.push({ level: "ok", area: "Pools", message: `${label} -> ${target.image} (${where})` });
      } else if (target.kind === "host") {
        findings.push({ level: "warning", area: "Pools", message: `${label} -> host mode (${where}). Steps run on this machine without isolation.` });
      } else {
        findings.push({ level: "warning", area: "Pools", message: `${label} is not runnable locally (${where}).`, remedy: target.reason });
      }
    }
    const groups = /* @__PURE__ */ new Set();
    for (const decl of [...pipeline2.variables, ...pipeline2.stages.flatMap((s) => s.variables), ...jobs.flatMap((j) => j.variables)]) {
      if (decl.group) groups.add(decl.group);
    }
    for (const group of groups) {
      const values = config.variableGroups[group];
      if (!values) {
        findings.push({
          level: "warning",
          area: "Variable groups",
          message: `Variable group '${group}' is used but has no local values.`,
          remedy: `Add it under 'variableGroups:' in .azp-local.yml.`
        });
      } else {
        const secrets = Object.entries(values).filter(([, v]) => v.secret).map(([name]) => name);
        findings.push({
          level: "ok",
          area: "Variable groups",
          message: `${group}: ${Object.keys(values).length} value(s)${secrets.length ? `, secrets prompted for: ${secrets.join(", ")}` : ""}`
        });
      }
    }
    const tasks = /* @__PURE__ */ new Map();
    for (const step of jobs.flatMap((j) => j.steps)) {
      if (step.run.kind !== "task") continue;
      const key = step.run.version ? `${step.run.name}@${step.run.version}` : step.run.name;
      const o = step.run.override;
      const override = !o ? void 0 : o.action === "script" ? `script ${o.script}` : o.action === "path" ? `task code in ${o.path}` : o.action;
      const entry = tasks.get(key) ?? { tier: step.run.tier, reason: step.run.tierReason, override, count: 0 };
      entry.count++;
      tasks.set(key, entry);
    }
    for (const [name, task] of tasks) {
      if (task.override) {
        findings.push({
          level: task.override.startsWith("script") ? "warning" : "info",
          area: "Tasks",
          message: `${name} (tier ${task.tier}) -> ${task.override}${task.override.startsWith("script") ? ". A replacement script runs instead of the real task." : ""}`
        });
      } else if (task.tier === 1) {
        findings.push({ level: "ok", area: "Tasks", message: `${name}: built in.` });
      } else if (task.tier === 2) {
        findings.push({
          level: "warning",
          area: "Tasks",
          message: `${name}: task package not available, so the step will be reported as not run.`,
          remedy: `Map a folder that holds its task.json: tasks: { ${name}: { path: ../tasks/${name.split("@")[0]} } }, or choose skip, fail or a replacement script.`
        });
      } else {
        findings.push({
          level: "warning",
          area: "Tasks",
          message: `${name}: cannot run locally. ${task.reason} The step will be reported as not run.`,
          remedy: `Decide in .azp-local.yml: tasks: { ${name}: skip }, fail, or { script: ./ci/local/stub.sh }.`
        });
      }
    }
  }
  return findings;
}
function renderFindings(findings) {
  const mark = { ok: "[ok]  ", info: "[info]", warning: "[warn]", error: "[fail]" };
  const lines = [];
  let area = "";
  for (const f of findings) {
    if (f.area !== area) {
      area = f.area;
      lines.push("", area);
    }
    lines.push(`  ${mark[f.level]} ${f.message}`);
    if (f.remedy) lines.push(`         -> ${f.remedy}`);
  }
  return lines.join("\n").trimStart();
}

// packages/engine-local/src/engine.ts
var crypto5 = __toESM(require("node:crypto"), 1);
var fs13 = __toESM(require("node:fs"), 1);
var os3 = __toESM(require("node:os"), 1);
var path17 = __toESM(require("node:path"), 1);

// packages/engine-local/src/backend.ts
var import_node_child_process2 = require("node:child_process");
var crypto2 = __toESM(require("node:crypto"), 1);
var fs7 = __toESM(require("node:fs"), 1);
var os = __toESM(require("node:os"), 1);
var path10 = __toESM(require("node:path"), 1);
var import_promises = require("node:stream/promises");

// packages/engine-local/src/workspace.ts
var import_node_child_process = require("node:child_process");
var fs6 = __toESM(require("node:fs"), 1);
var path9 = __toESM(require("node:path"), 1);
var import_node_stream = require("node:stream");
var import_ignore = __toESM(require_ignore(), 1);
var tar = __toESM(require_tar_stream(), 1);
function git(cwd, args) {
  return new Promise((resolve10) => {
    (0, import_node_child_process.execFile)("git", args, { cwd, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, (err, stdout) => resolve10(err ? void 0 : stdout));
  });
}
function walkAll(root, dir, out, prefix) {
  let entries;
  try {
    entries = fs6.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path9.join(dir, entry.name);
    if (entry.isDirectory()) walkAll(root, abs, out, prefix);
    else if (entry.isFile()) out.push({ abs, rel: prefix + path9.relative(root, abs).split(path9.sep).join("/") });
  }
}
function walkWithGitignore(root) {
  const out = [];
  const visit = (dir, rules) => {
    let entries;
    try {
      entries = fs6.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const local = [...rules];
    try {
      local.push({ base: dir, ig: (0, import_ignore.default)().add(fs6.readFileSync(path9.join(dir, ".gitignore"), "utf8")) });
    } catch {
    }
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const abs = path9.join(dir, entry.name);
      const isDir = entry.isDirectory();
      const ignored = local.some(({ base, ig }) => {
        const rel = path9.relative(base, abs).split(path9.sep).join("/");
        return ig.ignores(isDir ? `${rel}/` : rel);
      });
      if (ignored) continue;
      if (isDir) visit(abs, local);
      else if (entry.isFile()) out.push({ abs, rel: path9.relative(root, abs).split(path9.sep).join("/") });
    }
  };
  visit(root, []);
  return out;
}
async function listWorkspaceFiles(root, includeGitDir = true) {
  const isRepo = fs6.existsSync(path9.join(root, ".git"));
  const listed = isRepo ? await git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]) : void 0;
  if (listed === void 0) return { files: walkWithGitignore(root), source: "gitignore", normaliseEol: false };
  const modes = /* @__PURE__ */ new Map();
  const staged = await git(root, ["ls-files", "-z", "--stage"]);
  for (const record2 of (staged ?? "").split("\0")) {
    const m = /^(\d+) [0-9a-f]+ \d\t(.+)$/s.exec(record2);
    if (m) modes.set(m[2], m[1] === "100755" ? 493 : 420);
  }
  const files = [];
  for (const rel of new Set(listed.split("\0").filter(Boolean))) {
    const abs = path9.join(root, rel);
    try {
      if (fs6.statSync(abs).isFile()) files.push({ abs, rel, mode: modes.get(rel) });
    } catch {
    }
  }
  if (includeGitDir) walkAll(root, path9.join(root, ".git"), files, "");
  const autocrlf = (await git(root, ["config", "--get", "core.autocrlf"]) ?? "").trim().toLowerCase();
  return { files, source: "git", normaliseEol: process.platform === "win32" && autocrlf === "true" };
}
function listDirectory(dir) {
  const out = [];
  walkAll(dir, dir, out, "");
  return out;
}
var looksBinary = (buf) => buf.subarray(0, 8e3).includes(0);
function prepareContent(entry, normaliseEol) {
  let data = fs6.readFileSync(entry.abs);
  const insideGitDir = entry.rel.startsWith(".git/");
  if (normaliseEol && !insideGitDir && !looksBinary(data) && data.includes("\r\n")) {
    data = Buffer.from(data.toString("latin1").replace(/\r\n/g, "\n"), "latin1");
  }
  const mode = entry.mode ?? (data.length > 2 && data[0] === 35 && data[1] === 33 ? 493 : 420);
  return { data, mode };
}
function packFiles(files, normaliseEol = false) {
  const pack2 = tar.pack();
  (async () => {
    for (const entry of files) {
      let prepared;
      try {
        prepared = prepareContent(entry, normaliseEol);
      } catch {
        continue;
      }
      await new Promise((resolve10, reject) => {
        pack2.entry(
          { name: entry.rel, size: prepared.data.length, mode: prepared.mode, mtime: /* @__PURE__ */ new Date() },
          prepared.data,
          (err) => err ? reject(err) : resolve10()
        );
      });
    }
    pack2.finalize();
  })().catch((err) => pack2.destroy(err));
  return import_node_stream.Readable.from(pack2);
}
function packBuffer(name, data, mode = 420) {
  const pack2 = tar.pack();
  pack2.entry({ name, mode, mtime: /* @__PURE__ */ new Date() }, typeof data === "string" ? Buffer.from(data, "utf8") : data);
  pack2.finalize();
  return import_node_stream.Readable.from(pack2);
}
async function extractTar(stream, destDir, strip2) {
  const extract2 = tar.extract();
  let files = 0;
  let skippedLinks = 0;
  const done = new Promise((resolve10, reject) => {
    extract2.on("entry", (header, body, next) => {
      const parts = header.name.split("/").filter(Boolean);
      const rel = strip2 ? parts.slice(1) : parts;
      const target = path9.join(destDir, ...rel);
      const inside = path9.resolve(target).startsWith(path9.resolve(destDir));
      if (header.type === "file" && rel.length > 0 && inside) {
        fs6.mkdirSync(path9.dirname(target), { recursive: true });
        const out = fs6.createWriteStream(target);
        body.pipe(out);
        out.on("finish", () => {
          files++;
          next();
        });
        out.on("error", reject);
      } else {
        if (header.type === "symlink" || header.type === "link") skippedLinks++;
        else if (header.type === "directory" && inside) fs6.mkdirSync(target, { recursive: true });
        body.resume();
        body.on("end", next);
      }
    });
    extract2.on("finish", resolve10);
    extract2.on("error", reject);
  });
  stream.pipe(extract2);
  await done;
  return { files, skippedLinks };
}
async function firstFile(stream) {
  const extract2 = tar.extract();
  let found;
  const done = new Promise((resolve10, reject) => {
    extract2.on("entry", (header, body, next) => {
      if (header.type === "file" && found === void 0) {
        const chunks = [];
        body.on("data", (c) => chunks.push(c));
        body.on("end", () => {
          found = Buffer.concat(chunks);
          next();
        });
      } else {
        body.resume();
        body.on("end", next);
      }
    });
    extract2.on("finish", resolve10);
    extract2.on("error", reject);
  });
  stream.pipe(extract2);
  await done;
  return found;
}

// packages/engine-local/src/backend.ts
async function renameWithRetry(from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      fs7.renameSync(from, to);
      return;
    } catch (err) {
      const code = err.code;
      if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") throw err;
      if (attempt >= 8) {
        if (fs7.existsSync(to)) return;
        throw err;
      }
      await new Promise((resolve10) => setTimeout(resolve10, 50 * (attempt + 1)));
    }
  }
}
var TOOLS_VOLUME = "azp-local-tools";
var slug = (text2) => text2.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
var ContainerBackend = class {
  constructor(opts) {
    this.opts = opts;
    this.label = opts.image;
  }
  opts;
  kind = "container";
  os = "Linux";
  arch = "X64";
  label;
  paths = { workspace: "/__w/1", sources: "/__w/1/s", artifacts: "/__w/1/a", binaries: "/__w/1/b", temp: "/__w/_temp", tools: "/__t" };
  basePath = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
  pathDelimiter = ":";
  p = path10.posix;
  bash;
  containerId;
  network;
  serviceIds = [];
  get docker() {
    return this.opts.docker;
  }
  get id() {
    if (!this.containerId) throw new Error("The job container has not been created.");
    return this.containerId;
  }
  async prepare(log) {
    const { docker, opts } = this;
    await opts.ensureImage(opts.image, log);
    const unique = `${slug(opts.runId)}-${slug(opts.jobId)}-${crypto2.randomBytes(3).toString("hex")}`;
    const labels = { "azp-local": "true", "azp-local.run": opts.runId, "azp-local.job": opts.jobId };
    const serviceNames = Object.keys(opts.services);
    if (serviceNames.length > 0) {
      this.network = await docker.createNetwork(`azpl-${unique}`, labels);
      for (const alias of serviceNames) {
        const service = opts.services[alias];
        await opts.ensureImage(service.image, log);
        const id = await docker.createContainer({
          name: `azpl-${unique}-svc-${slug(alias)}`,
          image: service.image,
          env: service.env,
          labels: { ...labels, "azp-local.service": alias },
          network: `azpl-${unique}`,
          networkAliases: [alias],
          portBindings: service.ports
        });
        await docker.startContainer(id);
        this.serviceIds.push(id);
        log(`Started service container '${alias}' from ${service.image}`);
      }
    }
    const binds = [`${TOOLS_VOLUME}:${this.paths.tools}`];
    if (opts.mountWorkspace) binds.push(`${opts.mountWorkspace}:${this.paths.sources}`);
    if (opts.dockerSocket) binds.push("/var/run/docker.sock:/var/run/docker.sock");
    this.containerId = await docker.createContainer({
      name: `azpl-${unique}`,
      image: opts.image,
      // Keep the container alive for the job; each step is a separate exec.
      entrypoint: ["tail"],
      cmd: ["-f", "/dev/null"],
      env: opts.env,
      labels,
      binds,
      network: this.network ? `azpl-${unique}` : void 0,
      networkAliases: this.network ? ["job"] : void 0,
      nanoCpus: opts.matchHostedHardware ? 2e9 : void 0,
      memoryBytes: opts.matchHostedHardware ? 7 * 1024 ** 3 : void 0
    });
    await docker.startContainer(this.containerId);
    log(`Started job container ${this.containerId.slice(0, 12)} from ${opts.image}`);
    const p = this.paths;
    const probe = await docker.run(this.id, [
      "sh",
      "-c",
      `mkdir -p ${p.sources} ${p.artifacts} ${p.binaries} ${p.temp} ${p.tools} && echo "PATH=$PATH" && echo "ARCH=$(uname -m)" && echo "BASH=$(command -v bash || true)"`
    ]);
    if (probe.code !== 0) throw new Error(`Could not prepare the job container: ${probe.stderr.trim() || probe.stdout.trim()}`);
    const value = (key) => new RegExp(`^${key}=(.*)$`, "m").exec(probe.stdout)?.[1].trim() ?? "";
    this.basePath = value("PATH") || this.basePath;
    this.arch = /aarch64|arm64/.test(value("ARCH")) ? "ARM64" : "X64";
    this.bash = value("BASH") || void 0;
  }
  async exec(spec) {
    const pidFile = `${this.paths.temp}/.pid-${crypto2.randomBytes(6).toString("hex")}`;
    const stop = () => {
      const script = `pid=$(cat ${pidFile} 2>/dev/null) || exit 0; kill -TERM -- -$pid 2>/dev/null || kill -TERM $pid 2>/dev/null; sleep 2; kill -KILL -- -$pid 2>/dev/null || kill -KILL $pid 2>/dev/null; true`;
      this.docker.run(this.id, ["sh", "-c", script]).catch(() => void 0);
    };
    spec.signal?.addEventListener("abort", stop, { once: true });
    try {
      if (spec.signal?.aborted) return 137;
      const code = await this.docker.exec(
        this.id,
        { cmd: ["sh", "-c", 'echo $$ > "$0"; exec "$@"', pidFile, ...spec.cmd], env: spec.env, workingDir: spec.cwd },
        (stream, chunk) => stream === "out" ? spec.onOut(chunk) : spec.onErr(chunk)
      );
      return code;
    } finally {
      spec.signal?.removeEventListener("abort", stop);
      this.docker.run(this.id, ["rm", "-f", pidFile]).catch(() => void 0);
    }
  }
  async sh(script, cwd) {
    return this.docker.run(this.id, ["sh", "-c", script], cwd);
  }
  async mkdirp(dir) {
    const res = await this.docker.run(this.id, ["mkdir", "-p", dir]);
    if (res.code !== 0) throw new Error(res.stderr.trim() || `Could not create ${dir}`);
  }
  async exists(target) {
    return (await this.docker.run(this.id, ["test", "-e", target])).code === 0;
  }
  async isDirectory(target) {
    return (await this.docker.run(this.id, ["test", "-d", target])).code === 0;
  }
  async writeFile(file, content, mode = 420) {
    await this.docker.putArchive(this.id, path10.posix.dirname(file), packBuffer(path10.posix.basename(file), content, mode));
  }
  async readFile(file) {
    const stream = await this.docker.getArchive(this.id, file);
    return stream ? firstFile(stream) : void 0;
  }
  async copyIn(files, dest, normaliseEol = false) {
    await this.mkdirp(dest);
    await this.docker.putArchive(this.id, dest, packFiles(files, normaliseEol));
  }
  async copyOut(src, hostDir) {
    const isDir = await this.isDirectory(src);
    const stream = await this.docker.getArchive(this.id, src);
    if (!stream) return void 0;
    fs7.mkdirSync(hostDir, { recursive: true });
    return extractTar(stream, hostDir, isDir);
  }
  async listFiles(dir) {
    const res = await this.sh(`find . -type d \\( -name node_modules -o -name .git \\) -prune -o -type f -print`, dir);
    if (res.code !== 0) return [];
    return res.stdout.split("\n").filter(Boolean).map((line) => line.replace(/^\.\//, ""));
  }
  async cacheSave(src, entryBase) {
    const stream = await this.docker.getArchive(this.id, src);
    if (!stream) return false;
    fs7.mkdirSync(path10.dirname(entryBase), { recursive: true });
    const partial = `${entryBase}.${process.pid}.${crypto2.randomBytes(4).toString("hex")}.partial`;
    const final = `${entryBase}.tar`;
    try {
      await (0, import_promises.pipeline)(stream, fs7.createWriteStream(partial));
      await renameWithRetry(partial, final);
    } finally {
      fs7.rmSync(partial, { force: true });
    }
    return true;
  }
  async cacheRestore(entryBase, dest) {
    const file = `${entryBase}.tar`;
    if (!fs7.existsSync(file)) return false;
    const parent = path10.posix.dirname(dest);
    await this.mkdirp(parent);
    await this.docker.putArchive(this.id, parent, fs7.createReadStream(file));
    return true;
  }
  async dispose(keep) {
    if (keep && this.containerId) {
      return `docker exec -it -w ${this.paths.sources} ${this.containerId.slice(0, 12)} ${this.bash ? "bash" : "sh"}`;
    }
    if (this.containerId) await this.docker.removeContainer(this.containerId).catch(() => void 0);
    for (const id of this.serviceIds) await this.docker.removeContainer(id).catch(() => void 0);
    if (this.network) await this.docker.removeNetwork(this.network);
    this.containerId = void 0;
    return void 0;
  }
};
function which(name, searchPath = process.env.PATH ?? process.env.Path ?? "") {
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of searchPath.split(path10.delimiter).filter(Boolean)) {
    for (const ext of path10.extname(name) ? [""] : extensions) {
      const candidate = path10.join(dir, name + ext);
      try {
        if (fs7.statSync(candidate).isFile()) return candidate;
      } catch {
      }
    }
  }
  return void 0;
}
function findBash() {
  if (process.platform !== "win32") return which("bash");
  const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LocalAppData && path10.join(process.env.LocalAppData, "Programs")];
  for (const root of roots) {
    if (!root) continue;
    const candidate = path10.join(root, "Git", "bin", "bash.exe");
    if (fs7.existsSync(candidate)) return candidate;
  }
  const onPath = which("bash");
  return onPath && !/\\system32\\/i.test(onPath) ? onPath : void 0;
}
var HostBackend = class {
  kind = "host";
  os = process.platform === "win32" ? "Windows_NT" : process.platform === "darwin" ? "Darwin" : "Linux";
  arch = process.arch === "arm64" ? "ARM64" : "X64";
  label = "host";
  paths;
  basePath = process.env.PATH ?? process.env.Path ?? "";
  pathDelimiter = path10.delimiter;
  p = path10;
  bash;
  root;
  constructor(scratchRoot, toolsDir, id) {
    this.root = path10.join(scratchRoot, id);
    this.paths = {
      workspace: path10.join(this.root, "1"),
      sources: path10.join(this.root, "1", "s"),
      artifacts: path10.join(this.root, "1", "a"),
      binaries: path10.join(this.root, "1", "b"),
      temp: path10.join(this.root, "_temp"),
      tools: toolsDir
    };
  }
  async prepare(log) {
    fs7.rmSync(this.root, { recursive: true, force: true });
    for (const dir of Object.values(this.paths)) fs7.mkdirSync(dir, { recursive: true });
    this.bash = findBash();
    log(`Host mode: steps run on this machine (${os.type()} ${os.release()}) in ${this.root}`);
    log("Host mode is not isolated: steps use the tools installed here and can reach your files.");
  }
  exec(spec) {
    return new Promise((resolve10) => {
      if (spec.signal?.aborted) return resolve10(137);
      let child;
      try {
        child = (0, import_node_child_process2.spawn)(spec.cmd[0], spec.cmd.slice(1), {
          cwd: spec.cwd,
          env: spec.env,
          windowsHide: true,
          windowsVerbatimArguments: spec.verbatim,
          detached: process.platform !== "win32",
          stdio: ["ignore", "pipe", "pipe"]
        });
      } catch (err) {
        spec.onErr(Buffer.from(`${err.message}
`));
        return resolve10(127);
      }
      const stop = () => {
        if (child.pid === void 0) return;
        if (process.platform === "win32") (0, import_node_child_process2.spawn)("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        else {
          try {
            process.kill(-child.pid, "SIGTERM");
            setTimeout(() => {
              try {
                process.kill(-child.pid, "SIGKILL");
              } catch {
              }
            }, 2e3).unref();
          } catch {
          }
        }
      };
      spec.signal?.addEventListener("abort", stop, { once: true });
      child.stdout?.on("data", spec.onOut);
      child.stderr?.on("data", spec.onErr);
      child.on("error", (err) => {
        spec.onErr(Buffer.from(`${err.message}
`));
        resolve10(127);
      });
      child.on("close", (code, signal) => {
        spec.signal?.removeEventListener("abort", stop);
        resolve10(code ?? (signal ? 137 : 1));
      });
    });
  }
  async mkdirp(dir) {
    fs7.mkdirSync(dir, { recursive: true });
  }
  async exists(target) {
    return fs7.existsSync(target);
  }
  async isDirectory(target) {
    try {
      return fs7.statSync(target).isDirectory();
    } catch {
      return false;
    }
  }
  async writeFile(file, content) {
    fs7.mkdirSync(path10.dirname(file), { recursive: true });
    fs7.writeFileSync(file, content);
  }
  async readFile(file) {
    try {
      return fs7.readFileSync(file);
    } catch {
      return void 0;
    }
  }
  async copyIn(files, dest) {
    for (const file of files) {
      const target = path10.join(dest, ...file.rel.split("/"));
      fs7.mkdirSync(path10.dirname(target), { recursive: true });
      try {
        fs7.copyFileSync(file.abs, target);
      } catch {
      }
    }
  }
  async copyOut(src, hostDir) {
    if (!fs7.existsSync(src)) return void 0;
    fs7.mkdirSync(hostDir, { recursive: true });
    if (fs7.statSync(src).isDirectory()) {
      fs7.cpSync(src, hostDir, { recursive: true });
      return { files: listDirectory(hostDir).length, skippedLinks: 0 };
    }
    fs7.copyFileSync(src, path10.join(hostDir, path10.basename(src)));
    return { files: 1, skippedLinks: 0 };
  }
  async listFiles(dir) {
    const out = [];
    const walk = (current) => {
      let entries;
      try {
        entries = fs7.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const abs = path10.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".git") walk(abs);
        } else if (entry.isFile()) out.push(path10.relative(dir, abs).split(path10.sep).join("/"));
      }
    };
    walk(dir);
    return out;
  }
  async cacheSave(src, entryBase) {
    if (!fs7.existsSync(src)) return false;
    const target = `${entryBase}.dir`;
    fs7.rmSync(target, { recursive: true, force: true });
    fs7.mkdirSync(path10.dirname(target), { recursive: true });
    fs7.cpSync(src, target, { recursive: true });
    return true;
  }
  async cacheRestore(entryBase, dest) {
    const source = `${entryBase}.dir`;
    if (!fs7.existsSync(source)) return false;
    fs7.mkdirSync(dest, { recursive: true });
    fs7.cpSync(source, dest, { recursive: true });
    return true;
  }
  async dispose(keep) {
    if (keep) return `cd "${this.paths.sources}"`;
    try {
      fs7.rmSync(this.root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
    }
    return void 0;
  }
};

// packages/engine-local/src/docker.ts
var http = __toESM(require("node:http"), 1);
var os2 = __toESM(require("node:os"), 1);
var path11 = __toESM(require("node:path"), 1);
var DockerError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
  status;
};
function parseDockerHost(value) {
  if (value.startsWith("npipe://")) {
    const pipe = value.slice("npipe://".length).replace(/\//g, "\\");
    return { socketPath: pipe.startsWith("\\\\") ? pipe : `\\\\${pipe.replace(/^\\+/, "")}`, label: value };
  }
  if (value.startsWith("unix://")) return { socketPath: value.slice("unix://".length), label: value };
  if (value.startsWith("tcp://") || value.startsWith("http://")) {
    const url = new URL(value.replace(/^tcp:/, "http:"));
    return { host: url.hostname, port: Number(url.port || 2375), label: value };
  }
  return { socketPath: value, label: value };
}
function candidateEndpoints(configured2) {
  const out = [];
  if (configured2) out.push(parseDockerHost(configured2));
  if (process.env.DOCKER_HOST) out.push(parseDockerHost(process.env.DOCKER_HOST));
  if (process.platform === "win32") {
    out.push(parseDockerHost("npipe:////./pipe/docker_engine"));
    out.push(parseDockerHost("npipe:////./pipe/podman-machine-default"));
  } else {
    out.push(parseDockerHost("unix:///var/run/docker.sock"));
    out.push(parseDockerHost(`unix://${path11.join(os2.homedir(), ".rd/docker.sock")}`));
    out.push(parseDockerHost(`unix://${path11.join(os2.homedir(), ".docker/run/docker.sock")}`));
    if (process.env.XDG_RUNTIME_DIR) out.push(parseDockerHost(`unix://${path11.join(process.env.XDG_RUNTIME_DIR, "podman/podman.sock")}`));
  }
  return out.filter((e, i) => out.findIndex((o) => o.label === e.label) === i);
}
var DockerClient = class _DockerClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
  endpoint;
  /** The first endpoint that answers a ping. */
  static async connect(configured2) {
    const tried = [];
    for (const endpoint of candidateEndpoints(configured2)) {
      const client = new _DockerClient(endpoint);
      try {
        await client.ping();
        return client;
      } catch (err) {
        tried.push(`${endpoint.label}: ${err.message}`);
      }
    }
    throw new DockerError(`Docker is not reachable. Start Docker Desktop, Rancher Desktop (dockerd engine) or Podman, then try again.
  ${tried.join("\n  ")}`);
  }
  request(method, apiPath, opts = {}) {
    const query = Object.entries(opts.query ?? {}).filter(([, v]) => v !== void 0).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
    const headers = { Host: "docker", ...opts.headers ?? {} };
    let payload;
    if (opts.json !== void 0) {
      payload = Buffer.from(JSON.stringify(opts.json));
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(payload.length);
    } else if (Buffer.isBuffer(opts.body)) {
      payload = opts.body;
      headers["Content-Length"] = String(payload.length);
    }
    return new Promise((resolve10, reject) => {
      const req = http.request(
        {
          method,
          path: query ? `${apiPath}?${query}` : apiPath,
          headers,
          agent: false,
          ...this.endpoint.socketPath ? { socketPath: this.endpoint.socketPath } : { host: this.endpoint.host, port: this.endpoint.port }
        },
        resolve10
      );
      req.on("error", (err) => reject(new DockerError(err.message)));
      if (opts.timeoutMs) req.setTimeout(opts.timeoutMs, () => req.destroy(new Error("timed out")));
      if (payload) req.end(payload);
      else if (opts.body) {
        opts.body.on("error", (err) => req.destroy(err));
        opts.body.pipe(req);
      } else req.end();
    });
  }
  static async text(res) {
    const chunks = [];
    for await (const chunk of res) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  }
  async call(method, apiPath, opts = {}) {
    const res = await this.request(method, apiPath, opts);
    const text2 = await _DockerClient.text(res);
    if ((res.statusCode ?? 500) >= 400) throw _DockerClient.error(text2, res.statusCode);
    return text2 ? JSON.parse(text2) : void 0;
  }
  static error(text2, status) {
    try {
      return new DockerError(JSON.parse(text2).message ?? text2, status);
    } catch {
      return new DockerError(text2.trim() || `Docker returned HTTP ${status}`, status);
    }
  }
  /** Reads a stream of JSON progress objects (pull, build), failing on the first that carries an error. */
  async progress(res, onMessage) {
    if ((res.statusCode ?? 500) >= 400) throw _DockerClient.error(await _DockerClient.text(res), res.statusCode);
    let buffer = "";
    let failure;
    const handle = (line) => {
      if (!line.trim()) return;
      try {
        const message = JSON.parse(line);
        if (typeof message.error === "string") failure ??= message.error;
        else onMessage(message);
      } catch {
      }
    };
    for await (const chunk of res) {
      buffer += chunk.toString("utf8");
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        handle(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
      }
    }
    handle(buffer);
    if (failure) throw new DockerError(failure);
  }
  // --- daemon ------------------------------------------------------------------
  async ping() {
    const res = await this.request("GET", "/_ping", { timeoutMs: 4e3 });
    const text2 = await _DockerClient.text(res);
    if ((res.statusCode ?? 500) >= 400) throw _DockerClient.error(text2, res.statusCode);
  }
  version() {
    return this.call("GET", "/version");
  }
  info() {
    return this.call("GET", "/info");
  }
  // --- images ------------------------------------------------------------------
  async imageInfo(name) {
    try {
      return await this.call("GET", `/images/${name}/json`);
    } catch (err) {
      if (err instanceof DockerError && err.status === 404) return void 0;
      throw err;
    }
  }
  async pull(image, onStatus) {
    const lastColon = image.lastIndexOf(":");
    const hasTag = lastColon > image.lastIndexOf("/") && !image.includes("@");
    const res = await this.request("POST", "/images/create", {
      query: { fromImage: hasTag ? image.slice(0, lastColon) : image, tag: hasTag ? image.slice(lastColon + 1) : image.includes("@") ? void 0 : "latest" }
    });
    let last = "";
    await this.progress(res, (message) => {
      const status = String(message.status ?? "");
      const line = message.id && /^(Downloading|Extracting|Waiting|Verifying)/.test(status) ? "" : [message.id, status].filter(Boolean).join(": ");
      if (line && line !== last) {
        last = line;
        onStatus(line);
      }
    });
  }
  async build(context, tag, buildArgs, onOutput) {
    const res = await this.request("POST", "/build", {
      query: { t: tag, buildargs: JSON.stringify(buildArgs), rm: 1, forcerm: 1, version: 1 },
      headers: { "Content-Type": "application/x-tar" },
      body: context
    });
    await this.progress(res, (message) => {
      if (typeof message.stream === "string") onOutput(message.stream);
      else if (typeof message.status === "string" && !message.progressDetail) onOutput(`${message.status}
`);
    });
  }
  // --- containers --------------------------------------------------------------
  async createContainer(config) {
    const portBindings = {};
    const exposed = {};
    for (const mapping of config.portBindings ?? []) {
      const [hostPort, containerPort] = mapping.includes(":") ? mapping.split(":").slice(-2) : [mapping, mapping];
      const key = containerPort.includes("/") ? containerPort : `${containerPort}/tcp`;
      exposed[key] = {};
      portBindings[key] = [{ HostPort: hostPort }];
    }
    const created = await this.call("POST", "/containers/create", {
      query: { name: config.name },
      json: {
        Image: config.image,
        Cmd: config.cmd,
        Entrypoint: config.entrypoint,
        Env: Object.entries(config.env ?? {}).map(([k, v]) => `${k}=${v}`),
        WorkingDir: config.workingDir,
        Labels: config.labels,
        Tty: false,
        ExposedPorts: exposed,
        HostConfig: {
          Binds: config.binds,
          NanoCpus: config.nanoCpus,
          Memory: config.memoryBytes,
          PortBindings: portBindings,
          ...config.network ? { NetworkMode: config.network } : {}
        },
        ...config.network ? { NetworkingConfig: { EndpointsConfig: { [config.network]: { Aliases: config.networkAliases ?? [] } } } } : {}
      }
    });
    return created.Id;
  }
  async startContainer(id) {
    await this.call("POST", `/containers/${id}/start`);
  }
  async removeContainer(id) {
    try {
      await this.call("DELETE", `/containers/${id}`, { query: { force: 1, v: 1 } });
    } catch (err) {
      if (!(err instanceof DockerError && err.status === 404)) throw err;
    }
  }
  listContainers(label) {
    return this.call("GET", "/containers/json", { query: { all: 1, filters: JSON.stringify({ label: [label] }) } });
  }
  /**
   * Runs a process in a container and streams its output. Resolves with the exit code.
   * The output arrives as Docker's multiplexed stream: 8-byte frames of [stream, 0, 0, 0, length].
   */
  async exec(container, spec, onData) {
    const created = await this.call("POST", `/containers/${container}/exec`, {
      json: {
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: spec.cmd,
        Env: Object.entries(spec.env ?? {}).map(([k, v]) => `${k}=${v}`),
        WorkingDir: spec.workingDir,
        User: spec.user
      }
    });
    const res = await this.request("POST", `/exec/${created.Id}/start`, { json: { Detach: false, Tty: false } });
    if ((res.statusCode ?? 500) >= 400) throw _DockerClient.error(await _DockerClient.text(res), res.statusCode);
    let pending = Buffer.alloc(0);
    for await (const chunk of res) {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      while (pending.length >= 8) {
        const length = pending.readUInt32BE(4);
        if (pending.length < 8 + length) break;
        onData?.(pending[0] === 2 ? "err" : "out", pending.subarray(8, 8 + length));
        pending = pending.subarray(8 + length);
      }
    }
    const inspected = await this.call("GET", `/exec/${created.Id}/json`);
    return inspected.ExitCode ?? -1;
  }
  /** Runs a short command and returns what it printed. */
  async run(container, cmd, workingDir) {
    const out = [];
    const err = [];
    const code = await this.exec(container, { cmd, workingDir }, (stream, chunk) => (stream === "out" ? out : err).push(chunk));
    return { code, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") };
  }
  /** Extracts a tar stream into a directory of the container. */
  async putArchive(container, dir, tar2) {
    const res = await this.request("PUT", `/containers/${container}/archive`, {
      query: { path: dir },
      headers: { "Content-Type": "application/x-tar" },
      body: tar2
    });
    const text2 = await _DockerClient.text(res);
    if ((res.statusCode ?? 500) >= 400) throw _DockerClient.error(text2, res.statusCode);
  }
  /** A tar stream of a file or directory of the container, or undefined when the path does not exist. */
  async getArchive(container, target) {
    const res = await this.request("GET", `/containers/${container}/archive`, { query: { path: target } });
    if (res.statusCode === 404) {
      res.resume();
      return void 0;
    }
    if ((res.statusCode ?? 500) >= 400) throw _DockerClient.error(await _DockerClient.text(res), res.statusCode);
    return res;
  }
  // --- networks ----------------------------------------------------------------
  async createNetwork(name, labels) {
    return (await this.call("POST", "/networks/create", { json: { Name: name, Labels: labels } })).Id;
  }
  async removeNetwork(id) {
    try {
      await this.call("DELETE", `/networks/${id}`);
    } catch {
    }
  }
};

// packages/engine-local/src/logging.ts
function unescapeValue(value) {
  return value.replace(/%3B/gi, ";").replace(/%0D/gi, "\r").replace(/%0A/gi, "\n").replace(/%5D/gi, "]").replace(/%25/g, "%");
}
function parseLoggingCommand(line) {
  const start = line.indexOf("##vso[");
  if (start < 0) return void 0;
  const end = line.indexOf("]", start);
  if (end < 0) return void 0;
  const head = line.slice(start + 6, end);
  const space = head.indexOf(" ");
  const name = space < 0 ? head : head.slice(0, space);
  const dot = name.indexOf(".");
  if (dot <= 0) return void 0;
  const properties = {};
  if (space >= 0) {
    for (const pair of head.slice(space + 1).split(";")) {
      const eq = pair.indexOf("=");
      if (eq > 0) properties[pair.slice(0, eq).trim().toLowerCase()] = unescapeValue(pair.slice(eq + 1));
    }
  }
  return { area: name.slice(0, dot).toLowerCase(), action: name.slice(dot + 1).toLowerCase(), properties, data: unescapeValue(line.slice(end + 1)) };
}
function maskSecrets(line, secrets) {
  if (secrets.length === 0) return line;
  let out = line;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    if (secret.length >= 1 && out.includes(secret)) out = out.split(secret).join("***");
  }
  return out;
}
var LineSplitter = class {
  constructor(onLine) {
    this.onLine = onLine;
  }
  onLine;
  pending = "";
  push(chunk) {
    this.pending += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    let index;
    while ((index = this.pending.indexOf("\n")) >= 0) {
      this.onLine(this.pending.slice(0, index).replace(/\r$/, ""));
      this.pending = this.pending.slice(index + 1);
    }
  }
  flush() {
    if (this.pending.length > 0) this.onLine(this.pending.replace(/\r$/, ""));
    this.pending = "";
  }
};

// packages/engine-local/src/steps/artifacts.ts
var fs8 = __toESM(require("node:fs"), 1);
var path12 = __toESM(require("node:path"), 1);
var import_picomatch = __toESM(require_picomatch2(), 1);
var megabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
var RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
function artifactNameProblem(name) {
  if (!name.trim()) return "An artifact name must not be empty.";
  if (name.length > 255) return "An artifact name must be at most 255 characters.";
  if (/[\\/":<>|*?\u0000-\u001f]/.test(name)) return `Artifact name '${name}' must not contain \\ / " : < > | * ? or control characters.`;
  if (name === "." || name === "..") return `Artifact name '${name}' is not a folder name.`;
  if (/[. ]$/.test(name)) return `Artifact name '${name}' must not end with a dot or a space.`;
  if (RESERVED.test(name)) return `Artifact name '${name}' is reserved on Windows.`;
  return void 0;
}
function artifactPath(artifactsDir, name) {
  if (artifactNameProblem(name)) return void 0;
  const base = path12.resolve(artifactsDir);
  const target = path12.resolve(base, name);
  const rel = path12.relative(base, target);
  if (!rel || path12.isAbsolute(rel) || rel.startsWith("..") || rel.includes(path12.sep) || path12.dirname(target) !== base) return void 0;
  return target;
}
async function checkout(ctx, repository) {
  const { backend, io } = ctx;
  if (repository === "none") {
    ctx.log("Checkout is disabled for this job (checkout: none). The sources directory is empty.");
    return { result: "succeeded" };
  }
  let root = io.workspaceRoot;
  if (repository !== "self") {
    const mapped = Object.entries(io.config.repositories).find(([alias]) => alias.toLowerCase() === repository.toLowerCase())?.[1];
    if (!mapped) {
      return {
        result: "unsupported",
        message: `Repository '${repository}' is not mapped to a local folder. Add it under 'repositories:' in .azp-local.yml.`
      };
    }
    root = path12.resolve(io.workspaceRoot, mapped);
  }
  const many = ctx.job.steps.filter((s) => s.run.kind === "checkout" && s.run.repository !== "none").length > 1;
  const dest = many ? backend.p.join(backend.paths.sources, path12.basename(root)) : backend.paths.sources;
  if (io.config.workspace === "mount" && repository === "self" && backend.kind === "container" && !many) {
    ctx.log(`The workspace ${root} is mounted at ${dest}. Steps change your working tree directly, and ignored files are visible to them.`);
    return { result: "succeeded" };
  }
  const listing = await listWorkspaceFiles(root);
  const bytes = listing.files.reduce((sum, file) => {
    try {
      return sum + fs8.statSync(file.abs).size;
    } catch {
      return sum;
    }
  }, 0);
  ctx.log(`Copying ${listing.files.length} files (${megabytes(bytes)}) from ${root}`);
  ctx.log(
    listing.source === "git" ? "Source: files git tracks plus untracked files that are not ignored, with history." : "Source: every file not matched by a .gitignore (this folder is not a git repository)."
  );
  if (listing.normaliseEol) ctx.log("Line endings are converted to LF, as git would store them (core.autocrlf is on).");
  await backend.copyIn(listing.files, dest, listing.normaliseEol && backend.kind === "container");
  ctx.log(`Checked out to ${dest}`);
  return { result: "succeeded" };
}
async function publish(ctx, sourcePath, artifactName) {
  const { backend, io } = ctx;
  const name = artifactName || ctx.job.name;
  const src = ctx.resolve(sourcePath || backend.paths.artifacts);
  const dest = artifactPath(path12.join(io.runDir, "artifacts"), name);
  if (!dest) return { result: "failed", message: artifactNameProblem(name) ?? `Artifact name '${name}' is not allowed.` };
  if (fs8.existsSync(dest)) {
    return { result: "failed", message: `Artifact '${name}' already exists in this run. Artifact names must be unique.` };
  }
  const copied = await backend.copyOut(src, dest);
  if (!copied) return { result: "failed", message: `Path does not exist: ${src}` };
  if (copied.skippedLinks > 0) ctx.warn(`${copied.skippedLinks} symbolic link(s) in ${src} were not copied into the artifact.`);
  ctx.log(`Published artifact '${name}': ${copied.files} file(s) from ${src}`);
  ctx.log(`Stored at ${dest}`);
  ctx.emit({ type: "artifact", jobId: ctx.job.id, name, path: dest, files: copied.files });
  return { result: "succeeded" };
}
async function download(ctx, opts) {
  const { backend } = ctx;
  if (opts.source === "none") {
    ctx.log("Artifact download is disabled (download: none).");
    return { result: "succeeded" };
  }
  if (opts.source !== "current" && opts.source !== "") {
    return { result: "unsupported", message: `Artifacts of pipeline resource '${opts.source}' live in Azure DevOps and cannot be downloaded locally.` };
  }
  const names = opts.artifact ? [opts.artifact] : ctx.listArtifacts();
  for (const name of names) {
    const problem = artifactNameProblem(name);
    if (problem) return { result: "failed", message: problem };
  }
  if (names.length === 0) {
    ctx.log("No artifacts have been published in this run.");
    return { result: "succeeded" };
  }
  const base = opts.targetPath ? ctx.resolve(opts.targetPath) : backend.paths.workspace;
  const patterns = (opts.patterns ?? "**").split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const matches = (0, import_picomatch.default)(patterns.filter((p) => !p.startsWith("!")), { dot: true, ignore: patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1)) });
  for (const name of names) {
    const dir = ctx.findArtifact(name);
    if (!dir) {
      return { result: "failed", message: `Artifact '${name}' was not found. The job that publishes it has not run, or did not get that far.` };
    }
    const dest = opts.shortcut || names.length > 1 ? backend.p.join(base, name) : base;
    const files = listDirectory(dir).filter((file) => matches(file.rel));
    await backend.copyIn(files, dest);
    ctx.log(`Downloaded artifact '${name}': ${files.length} file(s) to ${dest}`);
  }
  return { result: "succeeded" };
}

// packages/engine-local/src/steps/cache.ts
var crypto3 = __toESM(require("node:crypto"), 1);
var fs9 = __toESM(require("node:fs"), 1);
var path13 = __toESM(require("node:path"), 1);
var import_picomatch2 = __toESM(require_picomatch2(), 1);
var sha = (data) => crypto3.createHash("sha256").update(data).digest("hex");
async function resolveKey(ctx, key, cwd) {
  const parts = [];
  let listing;
  for (const raw of key.split("|").map((s) => s.trim()).filter(Boolean)) {
    const quoted = /^"(.*)"$/.exec(raw) ?? /^'(.*)'$/.exec(raw);
    if (quoted) {
      parts.push(quoted[1]);
      continue;
    }
    if (/[*?[\]]/.test(raw)) {
      listing ??= await ctx.backend.listFiles(cwd);
      const matches = (0, import_picomatch2.default)(raw, { dot: true });
      const matched = listing.filter((file) => matches(file)).sort();
      if (matched.length > 0) {
        const hashes = [];
        for (const file of matched) hashes.push(sha(await ctx.backend.readFile(ctx.backend.p.join(cwd, file)) ?? ""));
        parts.push(sha(hashes.join("\n")));
        continue;
      }
    } else if (/[./\\]/.test(raw)) {
      const content = await ctx.backend.readFile(ctx.resolve(raw, cwd));
      if (content) {
        parts.push(sha(content));
        continue;
      }
    }
    parts.push(raw);
  }
  return parts.join("|");
}
async function cache2(ctx) {
  const keyInput = ctx.input("key");
  const pathInput = ctx.input("path");
  if (!keyInput || !pathInput) return { result: "failed", message: "Cache task: 'key' and 'path' are required." };
  const cwd = ctx.backend.paths.sources;
  const target = ctx.resolve(pathInput.split(/\r?\n/)[0].trim());
  const hitVar = ctx.input("cacheHitVar") || "CACHE_RESTORED";
  const store = path13.join(ctx.settings.cacheDir, `${ctx.backend.kind}-${ctx.backend.os.toLowerCase()}`);
  const indexFile = path13.join(store, "index.json");
  const readIndex = () => {
    try {
      return JSON.parse(fs9.readFileSync(indexFile, "utf8"));
    } catch {
      return [];
    }
  };
  const key = await resolveKey(ctx, keyInput, cwd);
  const scopedKey = `${key}
${target}`;
  ctx.log(`Resolved cache key: ${key}`);
  const exact = readIndex().find((e) => e.key === scopedKey);
  let restored = "false";
  if (exact && await ctx.backend.cacheRestore(path13.join(store, exact.entry), target)) {
    restored = "true";
    ctx.log(`Cache hit. Restored ${target}`);
  } else {
    for (const restoreKey of (ctx.input("restoreKeys") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
      const prefix = await resolveKey(ctx, restoreKey, cwd);
      const candidate = readIndex().filter((e) => e.key.split("\n")[0].startsWith(prefix) && e.key.endsWith(`
${target}`)).sort((a, b) => b.savedAt - a.savedAt)[0];
      if (candidate && await ctx.backend.cacheRestore(path13.join(store, candidate.entry), target)) {
        restored = "inexact";
        ctx.log(`No exact match. Restored ${target} from the closest entry (restore key: ${prefix})`);
        break;
      }
    }
    if (restored === "false") ctx.log("Cache miss. The path will be saved after the job if it succeeds.");
  }
  ctx.setVariable(hitVar, restored);
  ctx.addPostStep(`Post-job: ${ctx.step.displayName}`, async (post) => {
    if (restored === "true") {
      post.log("Cache hit on the primary key; nothing to save.");
      return { result: "succeeded" };
    }
    if (post.jobStatus() !== "Succeeded" && post.jobStatus() !== "SucceededWithIssues") {
      post.log("The job did not succeed; the cache is not saved.");
      return { result: "succeeded" };
    }
    const entry = sha(scopedKey).slice(0, 32);
    if (!await post.backend.cacheSave(target, path13.join(store, entry))) {
      post.warn(`Cache path does not exist, nothing saved: ${target}`);
      return { result: "succeeded" };
    }
    const index = readIndex().filter((e) => e.key !== scopedKey);
    index.push({ key: scopedKey, entry, savedAt: Date.now() });
    fs9.mkdirSync(store, { recursive: true });
    fs9.writeFileSync(indexFile, JSON.stringify(index, null, 2));
    post.log(`Saved ${target} to the local cache under key: ${key}`);
    return { result: "succeeded" };
  });
  return { result: "succeeded" };
}

// packages/engine-local/src/steps/custom.ts
var fs10 = __toESM(require("node:fs"), 1);
var path14 = __toESM(require("node:path"), 1);

// packages/engine-local/src/steps/script.ts
var crypto4 = __toESM(require("node:crypto"), 1);
var START = "========================== Starting Command Output ===========================";
function toOutcome(code, sawStderr, failOnStderr, what) {
  if (code !== 0) return { result: "failed", message: `${what} exited with code '${code}'.` };
  if (failOnStderr && sawStderr) return { result: "failed", message: `${what} wrote one or more lines to the standard error stream.` };
  return { result: "succeeded" };
}
async function runScript(ctx, shell, script, opts = {}) {
  const { backend } = ctx;
  const cwd = opts.cwd ? ctx.resolve(opts.cwd) : backend.paths.sources;
  if (!await backend.isDirectory(cwd)) {
    return { result: "failed", message: `Working directory not found: ${cwd}` };
  }
  const base = backend.p.join(backend.paths.temp, crypto4.randomUUID());
  const windows = backend.os === "Windows_NT";
  if (shell === "default" && windows) {
    const file2 = `${base}.cmd`;
    await backend.writeFile(file2, `@echo off\r
${script.replace(/\r?\n/g, "\r\n")}\r
`);
    ctx.log(START);
    const comspec = process.env.ComSpec ?? "cmd.exe";
    const res2 = await ctx.exec([comspec, "/D", "/E:ON", "/V:OFF", "/S", "/C", `"CALL "${file2}""`], { cwd, env: opts.env, verbatim: true });
    return toOutcome(res2.code, res2.sawStderr, opts.failOnStderr, "Cmd.exe");
  }
  if (shell === "default" || shell === "bash") {
    const file2 = `${base}.sh`;
    await backend.writeFile(file2, `${script.replace(/\r\n/g, "\n")}
`, 493);
    if (!backend.bash && windows) {
      return { result: "failed", message: "Bash was not found on this machine. Install Git for Windows to run bash steps in host mode." };
    }
    ctx.log(START);
    const scriptPath = windows ? file2.replace(/\\/g, "/") : file2;
    const cmd = backend.bash ? [backend.bash, "--noprofile", "--norc", scriptPath] : ["sh", scriptPath];
    const res2 = await ctx.exec(cmd, { cwd, env: opts.env });
    return toOutcome(res2.code, res2.sawStderr, opts.failOnStderr, "Bash");
  }
  const file = `${base}.ps1`;
  const preference = opts.errorActionPreference || "stop";
  const tail = opts.ignoreLastExitCode ? "" : "\nif (!(Test-Path -LiteralPath variable:\\LASTEXITCODE)) { exit 0 } else { exit $LASTEXITCODE }\n";
  await backend.writeFile(file, `$ErrorActionPreference = '${preference}'
$ProgressPreference = 'SilentlyContinue'
${script}
${tail}`);
  let program = shell === "powershell" && windows ? "powershell.exe" : "pwsh";
  if (backend.kind === "host" && !which(program)) {
    if (shell === "pwsh") return { result: "failed", message: "pwsh (PowerShell 7) was not found on this machine." };
    program = "pwsh";
  }
  ctx.log(START);
  const res = await ctx.exec([program, "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Unrestricted", "-Command", `. '${file}'`], {
    cwd,
    env: opts.env
  });
  if (res.code === 127 || res.code === 126) {
    return { result: "failed", message: `${program} is not available in ${backend.label}. Use an image that includes PowerShell.` };
  }
  return toOutcome(res.code, res.sawStderr, opts.failOnStderr, "PowerShell");
}
async function runScriptTask(ctx, task) {
  const cwd = ctx.input("workingDirectory", "cwd");
  const failOnStderr = ctx.boolInput("failOnStderr", false);
  if (task === "cmdline") return runScript(ctx, "default", ctx.input("script") ?? "", { cwd, failOnStderr });
  const fromFile = (ctx.input("targetType") ?? "filePath").toLowerCase() === "filepath" && !ctx.input("script");
  const args = ctx.input("arguments") ?? "";
  if (task === "bash") {
    let script2 = ctx.input("script") ?? "";
    if (fromFile) {
      const file = ctx.input("filePath");
      if (!file) return { result: "failed", message: "Bash task: 'filePath' or an inline 'script' is required." };
      const resolved = ctx.resolve(file);
      script2 = `bash '${ctx.backend.os === "Windows_NT" ? resolved.replace(/\\/g, "/") : resolved}' ${args}`;
    }
    return runScript(ctx, "bash", script2, { cwd, failOnStderr });
  }
  let script = ctx.input("script") ?? "";
  if (fromFile) {
    const file = ctx.input("filePath");
    if (!file) return { result: "failed", message: "PowerShell task: 'filePath' or an inline 'script' is required." };
    script = `. '${ctx.resolve(file)}' ${args}`;
  }
  return runScript(ctx, ctx.boolInput("pwsh", false) ? "pwsh" : "powershell", script, {
    cwd,
    failOnStderr,
    errorActionPreference: ctx.input("errorActionPreference"),
    ignoreLastExitCode: ctx.boolInput("ignoreLASTEXITCODE", false)
  });
}

// packages/engine-local/src/steps/custom.ts
var inputEnvName = (name) => `INPUT_${name.replace(/[ .]/g, "_").toUpperCase()}`;
function inputEnv(ctx, manifest) {
  const env = {};
  for (const input of manifest?.inputs ?? []) {
    const given = ctx.input(input.name, ...input.aliases ?? []);
    const value = given ?? (input.defaultValue === void 0 ? void 0 : String(input.defaultValue));
    if (value !== void 0) env[inputEnvName(input.name)] = ctx.expand(value);
  }
  for (const [name, value] of Object.entries(ctx.inputs)) env[inputEnvName(name)] ??= value;
  return env;
}
async function runTaskFromFolder(ctx, folder) {
  const hostDir = path14.resolve(ctx.io.workspaceRoot, folder);
  let manifest;
  try {
    manifest = JSON.parse(fs10.readFileSync(path14.join(hostDir, "task.json"), "utf8"));
  } catch (err) {
    return { result: "failed", message: `No readable task.json in ${hostDir}: ${err.message}` };
  }
  const handlers = Object.entries(manifest.execution ?? {});
  const node = handlers.filter(([name]) => /^node/i.test(name)).sort(([a], [b]) => b.localeCompare(a, void 0, { numeric: true }))[0];
  if (!node?.[1].target) {
    const names = handlers.map(([name]) => name).join(", ") || "none";
    return {
      result: "unsupported",
      message: `Task '${manifest.name ?? ctx.step.displayName}' has no Node handler (found: ${names}). PowerShell-handler tasks are not run locally.`
    };
  }
  const dest = ctx.backend.p.join(ctx.backend.paths.temp, "_tasks", path14.basename(hostDir));
  await ctx.backend.copyIn(listDirectory(hostDir), dest);
  const target = ctx.backend.p.join(dest, ...node[1].target.split(/[\\/]/));
  ctx.log(`Task ${manifest.name ?? ""} from ${hostDir} (handler ${node[0]}: ${node[1].target})`);
  ctx.log("==============================================================================");
  const res = await ctx.exec(["node", target], { cwd: ctx.backend.paths.sources, env: inputEnv(ctx, manifest) });
  if (res.code === 127 || res.code === 126) {
    return { result: "failed", message: "node was not found. Add a Node tool installer step before this task, or use an image that includes Node.js." };
  }
  return res.code === 0 ? { result: "succeeded" } : { result: "failed", message: `The task exited with code ${res.code}.` };
}
async function runReplacementScript(ctx, script, taskName) {
  const hostFile = path14.resolve(ctx.io.workspaceRoot, script);
  let content;
  try {
    content = fs10.readFileSync(hostFile, "utf8");
  } catch {
    return { result: "failed", message: `Replacement script not found: ${hostFile}` };
  }
  ctx.log(`${taskName} cannot run locally. Running ${script} in its place, as .azp-local.yml says.`);
  const ext = path14.extname(hostFile).toLowerCase();
  const shell = ext === ".ps1" ? "pwsh" : ext === ".cmd" || ext === ".bat" ? "default" : "bash";
  const outcome = await runScript(ctx, shell, content, { env: inputEnv(ctx) });
  return { ...outcome, gap: `${taskName} was replaced by ${script}` };
}

// packages/engine-local/src/steps/node.ts
var fs11 = __toESM(require("node:fs"), 1);
var https = __toESM(require("node:https"), 1);
var path15 = __toESM(require("node:path"), 1);
var INDEX_URL = "https://nodejs.org/dist/index.json";
var DAY = 24 * 60 * 60 * 1e3;
function fetchText(url, redirects = 3) {
  return new Promise((resolve10, reject) => {
    const req = https.get(url, { timeout: 2e4 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve10(fetchText(new URL(res.headers.location, url).toString(), redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve10(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error(`Timed out fetching ${url}`)));
    req.on("error", reject);
  });
}
function downloadFile(url, dest, redirects = 3) {
  return new Promise((resolve10, reject) => {
    const req = https.get(url, { timeout: 6e4 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve10(downloadFile(new URL(res.headers.location, url).toString(), dest, redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const out = fs11.createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => out.close(() => resolve10()));
      out.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`Timed out downloading ${url}`)));
    req.on("error", reject);
  });
}
async function releases(homeDir) {
  const file = path15.join(homeDir, "node-index.json");
  const read = () => {
    try {
      return JSON.parse(fs11.readFileSync(file, "utf8"));
    } catch {
      return void 0;
    }
  };
  try {
    if (Date.now() - fs11.statSync(file).mtimeMs < DAY) return read();
  } catch {
  }
  try {
    const all = JSON.parse(await fetchText(INDEX_URL)).map((r) => ({ version: r.version.replace(/^v/, ""), lts: r.lts }));
    fs11.mkdirSync(homeDir, { recursive: true });
    fs11.writeFileSync(file, JSON.stringify(all));
    return all;
  } catch {
    return read();
  }
}
var parse = (version) => version.replace(/^v/, "").split(".").map((n) => Number(n));
var compare2 = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};
function resolveNodeVersion(spec, available) {
  const wanted = spec.trim().toLowerCase();
  const sorted = [...available].sort((a, b) => compare2(b.version, a.version));
  if (["", "*", "x", "latest", "current", "node"].includes(wanted)) return sorted[0]?.version;
  if (wanted === "lts" || wanted === "lts/*") return sorted.find((r) => r.lts)?.version;
  let m;
  if (m = /^lts\/(\w+)$/.exec(wanted)) return sorted.find((r) => typeof r.lts === "string" && r.lts.toLowerCase() === m[1])?.version;
  if (m = /^v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(wanted)) {
    const want = [m[1], m[2], m[3]].map((part) => part === void 0 || part === "x" || part === "*" ? void 0 : Number(part));
    return sorted.find((r) => parse(r.version).every((n, i) => want[i] === void 0 || want[i] === n))?.version;
  }
  if (m = /^(>=|\^|~)\s*v?(\d+(?:\.\d+){0,2})$/.exec(wanted)) {
    const floor = m[2];
    const [major, minor] = parse(floor);
    return sorted.find((r) => {
      if (compare2(r.version, floor) < 0) return false;
      const [rMajor, rMinor] = parse(r.version);
      if (m[1] === "^") return rMajor === major;
      if (m[1] === "~") return rMajor === major && (minor === void 0 || rMinor === minor);
      return true;
    })?.version;
  }
  return void 0;
}
async function useNode(ctx) {
  const { backend } = ctx;
  let spec = ctx.input("version", "versionSpec") ?? "";
  const versionFile = ctx.input("versionFilePath");
  if ((ctx.input("versionSource") ?? "").toLowerCase() === "fromfile" && versionFile) {
    const content = await backend.readFile(ctx.resolve(versionFile));
    if (!content) return { result: "failed", message: `Version file not found: ${versionFile}` };
    spec = content.toString("utf8").trim();
  }
  if (!spec) return { result: "failed", message: "Node tool installer: a 'version' is required." };
  const arch = backend.arch === "ARM64" ? "arm64" : "x64";
  const root = backend.p.join(backend.paths.tools, "node");
  const index = await releases(ctx.settings.homeDir);
  let candidates = index;
  if (!candidates) {
    ctx.warn("The Node.js release list could not be fetched; choosing from versions already in the tool cache.");
    candidates = (await backend.listFiles(root).catch(() => [])).map((file) => /^(\d+\.\d+\.\d+)\/([^/]+)\.complete$/.exec(file)).filter((m) => !!m && m[2] === arch).map((m) => ({ version: m[1], lts: false }));
  }
  const version = resolveNodeVersion(spec, candidates);
  if (!version) {
    return {
      result: "failed",
      message: index ? `No Node.js version matches '${spec}'.` : `No cached Node.js version matches '${spec}', and nodejs.org could not be reached.`
    };
  }
  const dir = backend.p.join(root, version, arch);
  const marker = `${dir}.complete`;
  if (await backend.exists(marker)) {
    ctx.log(`Found Node.js ${version} in the tool cache: ${dir}`);
  } else if (backend.os === "Windows_NT") {
    const url = `https://nodejs.org/dist/v${version}/node-v${version}-win-${arch}.zip`;
    const zip = path15.join(backend.paths.temp, `node-v${version}.zip`);
    ctx.log(`Downloading ${url}`);
    try {
      await downloadFile(url, zip);
    } catch (err) {
      return { result: "failed", message: `Could not download Node.js ${version}: ${err.message}` };
    }
    await backend.mkdirp(dir);
    const tarExe = path15.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
    const res = await ctx.exec([tarExe, "-xf", zip, "-C", dir, "--strip-components=1"], { cwd: backend.paths.temp });
    if (res.code !== 0) return { result: "failed", message: `Could not extract ${zip}` };
    await backend.writeFile(marker, "");
  } else {
    const platform = backend.os === "Darwin" ? "darwin" : "linux";
    const url = `https://nodejs.org/dist/v${version}/node-v${version}-${platform}-${arch}.tar.gz`;
    ctx.log(`Downloading ${url}`);
    const script = [
      "set -e",
      `mkdir -p '${dir}'`,
      `if command -v curl >/dev/null 2>&1; then curl -fsSL '${url}'; else wget -qO- '${url}'; fi | tar -xz -C '${dir}' --strip-components=1`,
      `touch '${marker}'`
    ].join("\n");
    const res = await ctx.exec(["sh", "-c", script], { cwd: backend.paths.temp });
    if (res.code !== 0) {
      return { result: "failed", message: `Could not install Node.js ${version}. The image needs curl or wget, tar, and network access.` };
    }
  }
  ctx.prependPath(backend.os === "Windows_NT" ? dir : backend.p.join(dir, "bin"));
  ctx.log(`Using Node.js ${version} (requested '${spec}')`);
  return { result: "succeeded" };
}

// packages/engine-local/src/steps/publish.ts
var fs12 = __toESM(require("node:fs"), 1);
var path16 = __toESM(require("node:path"), 1);
var import_picomatch3 = __toESM(require_picomatch2(), 1);

// node_modules/fast-xml-parser/src/util.js
var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
var regexName = new RegExp("^" + nameRegexp + "$");
function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}
var isName = function(string) {
  const match = regexName.exec(string);
  return !(match === null || typeof match === "undefined");
};
function isExist(v) {
  return typeof v !== "undefined";
}
var DANGEROUS_PROPERTY_NAMES = [
  // '__proto__',
  // 'constructor',
  // 'prototype',
  "hasOwnProperty",
  "toString",
  "valueOf",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__"
];
var criticalProperties = ["__proto__", "constructor", "prototype"];

// node_modules/fast-xml-parser/src/validator.js
var defaultOptions = {
  allowBooleanAttributes: false,
  //A tag can have attributes without any value
  unpairedTags: []
};
function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions, options);
  const tags = [];
  let tagFound = false;
  let reachedRoot = false;
  if (xmlData[0] === "\uFEFF") {
    xmlData = xmlData.substr(1);
  }
  for (let i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === "<") {
      let tagStartPos = i;
      i++;
      if (xmlData[i] === "!") {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === "/") {
          closingTag = true;
          i++;
        }
        let tagName = "";
        for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        if (tagName[tagName.length - 1] === "/") {
          tagName = tagName.substring(0, tagName.length - 1);
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
        }
        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;
        if (attrStr[attrStr.length - 1] === "/") {
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
          } else {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject(
                "InvalidTag",
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos)
              );
            }
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }
          if (reachedRoot === true) {
            return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            if (xmlData[i + 1] === "!") {
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i + 1] === "?") {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === "&") {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        }
        if (xmlData[i] === "<") {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }
  if (!tagFound) {
    return getErrorObject("InvalidXml", "Start tag expected.", 1);
  } else if (tags.length == 1) {
    return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
  }
  return true;
}
function isWhiteSpace(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == "?" || xmlData[i] == " ") {
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === "xml") {
        return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}
function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "<") {
        angleBracketsCount++;
      } else if (xmlData[i] === ">") {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  }
  return i;
}
var doubleQuote = '"';
var singleQuote = "'";
function readAttributeStr(xmlData, i) {
  let attrStr = "";
  let startChar = "";
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === "") {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
      } else {
        startChar = "";
      }
    } else if (xmlData[i] === ">") {
      if (startChar === "") {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== "") {
    return false;
  }
  return {
    value: attrStr,
    index: i,
    tagClosed
  };
}
function scanAttributeTokens(attrStr) {
  const tokens = [];
  const len = attrStr.length;
  let i = 0;
  while (i < len) {
    const tokenStart = i;
    while (i < len && isWhiteSpace(attrStr[i])) i++;
    if (i >= len) break;
    if (attrStr[i] === "=") {
      i = tokenStart + 1;
      continue;
    }
    const leadingWs = attrStr.slice(tokenStart, i);
    const nameStart = i;
    while (i < len && !isWhiteSpace(attrStr[i]) && attrStr[i] !== "=") i++;
    const name = attrStr.slice(nameStart, i);
    let equalsGroup;
    let j = i;
    while (j < len && isWhiteSpace(attrStr[j])) j++;
    if (j < len && attrStr[j] === "=") {
      equalsGroup = attrStr.slice(i, j + 1);
      i = j + 1;
    }
    let quoteChar;
    let value;
    let k = i;
    while (k < len && isWhiteSpace(attrStr[k])) k++;
    if (k < len && (attrStr[k] === '"' || attrStr[k] === "'")) {
      const valueStart = k + 1;
      const closeIdx = attrStr.indexOf(attrStr[k], valueStart);
      if (closeIdx !== -1) {
        quoteChar = attrStr[k];
        value = attrStr.slice(valueStart, closeIdx);
        i = closeIdx + 1;
      }
    }
    const token = { startIndex: tokenStart };
    token[1] = leadingWs;
    token[2] = name;
    token[3] = equalsGroup;
    token[4] = quoteChar !== void 0 ? true : void 0;
    token[5] = quoteChar;
    token[6] = value;
    tokens.push(token);
  }
  return tokens;
}
function validateAttributeString(attrStr, options) {
  const matches = scanAttributeTokens(attrStr);
  const attrNames = {};
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
      return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      attrNames[attrName] = 1;
    } else {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }
  return true;
}
function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === "x") {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ";")
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}
function validateAmpersand(xmlData, i) {
  i++;
  if (xmlData[i] === ";")
    return -1;
  if (xmlData[i] === "#") {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ";")
      break;
    return -1;
  }
  return i;
}
function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col
    }
  };
}
function validateAttrName(attrName) {
  return isName(attrName);
}
function validateTagName(tagname) {
  return isName(tagname);
}
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

// node_modules/@nodable/entities/src/entities.js
var CURRENCY = {
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  euro: "\u20AC",
  dollar: "$",
  fnof: "\u0192",
  inr: "\u20B9",
  af: "\u060B",
  birr: "\u1265\u122D",
  peso: "\u20B1",
  rub: "\u20BD",
  won: "\u20A9",
  yuan: "\xA5",
  cedil: "\xB8"
};
var XML = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"'
};
var COMMON_HTML = {
  nbsp: "\xA0",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  laquo: "\xAB",
  raquo: "\xBB",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "\u2022",
  para: "\xB6",
  sect: "\xA7",
  deg: "\xB0",
  frac12: "\xBD",
  frac14: "\xBC",
  frac34: "\xBE"
};

// node_modules/@nodable/entities/src/EntityDecoder.js
var ENTITY_ACTION = Object.freeze({
  /** Resolve and expand the entity normally. */
  ALLOW: "allow",
  /** Silently skip this entity — it will not be registered. */
  BLOCK: "block",
  /** Throw an error, aborting entity registration entirely. */
  THROW: "throw"
});
var SPECIAL_CHARS = new Set("!?\\\\/[]$%{}^&*()<>|+");
function validateEntityName(name) {
  if (name[0] === "#") {
    throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${name}"`);
  }
  for (const ch of name) {
    if (SPECIAL_CHARS.has(ch)) {
      throw new Error(`[EntityReplacer] Invalid character '${ch}' in entity name: "${name}"`);
    }
  }
  return name;
}
function mergeEntityMaps(...maps) {
  const out = /* @__PURE__ */ Object.create(null);
  for (const map of maps) {
    if (!map) continue;
    for (const key of Object.keys(map)) {
      const raw = map[key];
      if (typeof raw === "string") {
        out[key] = raw;
      } else if (raw && typeof raw === "object" && raw.val !== void 0) {
        const val = raw.val;
        if (typeof val === "string") {
          out[key] = val;
        }
      }
    }
  }
  return out;
}
var LIMIT_TIER_EXTERNAL = "external";
var LIMIT_TIER_BASE = "base";
var LIMIT_TIER_ALL = "all";
function parseLimitTiers(raw) {
  if (!raw || raw === LIMIT_TIER_EXTERNAL) return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
  if (raw === LIMIT_TIER_ALL) return /* @__PURE__ */ new Set([LIMIT_TIER_ALL]);
  if (raw === LIMIT_TIER_BASE) return /* @__PURE__ */ new Set([LIMIT_TIER_BASE]);
  if (Array.isArray(raw)) return new Set(raw);
  return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
}
var NCR_LEVEL = Object.freeze({ allow: 0, leave: 1, remove: 2, throw: 3 });
var XML10_ALLOWED_C0 = /* @__PURE__ */ new Set([9, 10, 13]);
function parseNCRConfig(ncr) {
  if (!ncr) {
    return { xmlVersion: 1, onLevel: NCR_LEVEL.allow, nullLevel: NCR_LEVEL.remove };
  }
  const xmlVersion = ncr.xmlVersion === 1.1 ? 1.1 : 1;
  const onLevel = NCR_LEVEL[ncr.onNCR] ?? NCR_LEVEL.allow;
  const nullLevel = NCR_LEVEL[ncr.nullNCR] ?? NCR_LEVEL.remove;
  const clampedNull = Math.max(nullLevel, NCR_LEVEL.remove);
  return { xmlVersion, onLevel, nullLevel: clampedNull };
}
var EntityDecoder = class {
  /**
   * @param {object} [options]
   * @param {object|null}  [options.namedEntities]        — extra named entities merged into base map
   * @param {object}  [options.limit]                 — security limits
   * @param {number}       [options.limit.maxTotalExpansions=0]  — 0 = unlimited
   * @param {number}       [options.limit.maxExpandedLength=0]   — 0 = unlimited
   * @param {'external'|'base'|'all'|string[]} [options.limit.applyLimitsTo='external']
   *   Which entity tiers count against the security limits:
   *   - 'external' (default) — only input/runtime + persistent external entities
   *   - 'base'               — only DEFAULT_XML_ENTITIES + namedEntities
   *   - 'all'                — every entity regardless of tier
   *   - string[]             — explicit combination, e.g. ['external', 'base']
   * @param {((resolved: string, original: string) => string)|null} [options.postCheck=null]
   * @param {string[]} [options.remove=[]] — entity names (e.g. ['nbsp', '#13']) to delete (replace with empty string)
   * @param {string[]} [options.leave=[]]  — entity names to keep as literal (unchanged in output)
   * @param {object}   [options.ncr]       — Numeric Character Reference controls
   * @param {1.0|1.1}  [options.ncr.xmlVersion=1.0]
   *   XML version governing which codepoint ranges are restricted:
   *   - 1.0 — C0 controls U+0001–U+001F (except U+0009/000A/000D) are prohibited
   *   - 1.1 — C0 controls are allowed when written as NCRs; C1 (U+007F–U+009F) decoded as-is
   * @param {'allow'|'leave'|'remove'|'throw'} [options.ncr.onNCR='allow']
   *   Base action for numeric references. Severity order: allow < leave < remove < throw.
   *   For codepoint ranges that carry a minimum level (surrogates → remove, XML 1.0 C0 → remove),
   *   the effective action is max(onNCR, rangeMinimum).
   * @param {'remove'|'throw'} [options.ncr.nullNCR='remove']
   *   Action for U+0000 (null). 'allow' and 'leave' are clamped to 'remove' since null is never safe.
   * @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} [options.onExternalEntity=null]
   *   Hook called when an external entity is registered via `setExternalEntities()` or
   *   `addExternalEntity()`. Return `ENTITY_ACTION.ALLOW` to accept the entity,
   *   `ENTITY_ACTION.BLOCK` to silently skip it, or `ENTITY_ACTION.THROW` to abort with an error.
   * @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} [options.onInputEntity=null]
   *   Hook called when an input entity is registered via `addInputEntities()`. Return
   *   `ENTITY_ACTION.ALLOW` to accept, `ENTITY_ACTION.BLOCK` to silently skip, or
   *   `ENTITY_ACTION.THROW` to abort with an error.
   */
  constructor(options = {}) {
    this._limit = options.limit || {};
    this._maxTotalExpansions = this._limit.maxTotalExpansions || 0;
    this._maxExpandedLength = this._limit.maxExpandedLength || 0;
    this._postCheck = typeof options.postCheck === "function" ? options.postCheck : (r) => r;
    this._limitTiers = parseLimitTiers(this._limit.applyLimitsTo ?? LIMIT_TIER_EXTERNAL);
    this._numericAllowed = options.numericAllowed ?? true;
    this._baseMap = mergeEntityMaps(XML, options.namedEntities || null);
    this._externalMap = /* @__PURE__ */ Object.create(null);
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    this._removeSet = new Set(options.remove && Array.isArray(options.remove) ? options.remove : []);
    this._leaveSet = new Set(options.leave && Array.isArray(options.leave) ? options.leave : []);
    const ncrCfg = parseNCRConfig(options.ncr);
    this._ncrXmlVersion = ncrCfg.xmlVersion;
    this._ncrOnLevel = ncrCfg.onLevel;
    this._ncrNullLevel = ncrCfg.nullLevel;
    this._onExternalEntity = typeof options.onExternalEntity === "function" ? options.onExternalEntity : null;
    this._onInputEntity = typeof options.onInputEntity === "function" ? options.onInputEntity : null;
  }
  // -------------------------------------------------------------------------
  // Private: registration hook dispatch
  // -------------------------------------------------------------------------
  /**
   * Invoke a registration hook for a single entity name/value pair.
   * Returns true when the entity should be accepted, false when it should be
   * silently skipped (BLOCK), and throws when the hook returns THROW.
   *
   * @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} hook
   * @param {string} name
   * @param {string} value
   * @param {string} context  — used in error messages ('external' | 'input')
   * @returns {boolean}  true = accept, false = skip
   */
  _applyRegistrationHook(hook, name, value, context) {
    if (!hook) return true;
    const action = hook(name, value);
    if (action === ENTITY_ACTION.BLOCK) return false;
    if (action === ENTITY_ACTION.THROW) {
      throw new Error(
        `[EntityDecoder] Registration of ${context} entity "&${name};" was rejected by hook`
      );
    }
    return true;
  }
  // -------------------------------------------------------------------------
  // Persistent external entity registration
  // -------------------------------------------------------------------------
  /**
   * Replace the full set of persistent external entities.
   * All keys are validated — throws on invalid characters.
   * If `onExternalEntity` is set, it is called once per entry; entries that
   * return `ENTITY_ACTION.BLOCK` are silently omitted, `ENTITY_ACTION.THROW`
   * aborts the whole call.
   * @param {Record<string, string | { regex?: RegExp, val: string }>} map
   */
  setExternalEntities(map) {
    if (map) {
      for (const key of Object.keys(map)) {
        validateEntityName(key);
      }
    }
    if (!this._onExternalEntity) {
      this._externalMap = mergeEntityMaps(map);
      return;
    }
    const flat = mergeEntityMaps(map);
    const filtered2 = /* @__PURE__ */ Object.create(null);
    for (const [name, value] of Object.entries(flat)) {
      if (this._applyRegistrationHook(this._onExternalEntity, name, value, "external")) {
        filtered2[name] = value;
      }
    }
    this._externalMap = filtered2;
  }
  /**
   * Add a single persistent external entity.
   * If `onExternalEntity` is set it is called before the entity is stored;
   * `ENTITY_ACTION.BLOCK` silently skips storage, `ENTITY_ACTION.THROW` raises.
   * @param {string} key
   * @param {string} value
   */
  addExternalEntity(key, value) {
    validateEntityName(key);
    if (typeof value === "string" && value.indexOf("&") === -1) {
      if (this._applyRegistrationHook(this._onExternalEntity, key, value, "external")) {
        this._externalMap[key] = value;
      }
    }
  }
  // -------------------------------------------------------------------------
  // Input / runtime entity registration (per document)
  // -------------------------------------------------------------------------
  /**
   * Inject DOCTYPE entities for the current document.
   * Also resets per-document expansion counters.
   * If `onInputEntity` is set it is called once per entry; entries returning
   * `ENTITY_ACTION.BLOCK` are silently omitted, `ENTITY_ACTION.THROW` aborts.
   * @param {Record<string, string | { regx?: RegExp, regex?: RegExp, val: string }>} map
   */
  addInputEntities(map) {
    this._totalExpansions = 0;
    this._expandedLength = 0;
    if (!this._onInputEntity) {
      this._inputMap = mergeEntityMaps(map);
      return;
    }
    const flat = mergeEntityMaps(map);
    const filtered2 = /* @__PURE__ */ Object.create(null);
    for (const [name, value] of Object.entries(flat)) {
      if (this._applyRegistrationHook(this._onInputEntity, name, value, "input")) {
        filtered2[name] = value;
      }
    }
    this._inputMap = filtered2;
  }
  // -------------------------------------------------------------------------
  // Per-document reset
  // -------------------------------------------------------------------------
  /**
   * Wipe input/runtime entities and reset counters.
   * Call this before processing each new document.
   * @returns {this}
   */
  reset() {
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    return this;
  }
  // -------------------------------------------------------------------------
  // XML version (can be set after construction, e.g. once parser reads <?xml?>)
  // -------------------------------------------------------------------------
  /**
   * Update the XML version used for NCR classification.
   * Call this as soon as the document's `<?xml version="...">` declaration is parsed.
   * @param {1.0|1.1|number} version
   */
  setXmlVersion(version) {
    this._ncrXmlVersion = version === 1.1 ? 1.1 : 1;
  }
  // -------------------------------------------------------------------------
  // Primary API
  // -------------------------------------------------------------------------
  /**
   * Replace all entity references in `str` in a single pass.
   *
   * @param {string} str
   * @returns {string}
   */
  decode(str) {
    if (typeof str !== "string" || str.length === 0) return str;
    if (str.indexOf("&") === -1) return str;
    const original = str;
    const chunks = [];
    const len = str.length;
    let last = 0;
    let i = 0;
    const limitExpansions = this._maxTotalExpansions > 0;
    const limitLength = this._maxExpandedLength > 0;
    const checkLimits = limitExpansions || limitLength;
    while (i < len) {
      if (str.charCodeAt(i) !== 38) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < len && str.charCodeAt(j) !== 59 && j - i <= 32) j++;
      if (j >= len || str.charCodeAt(j) !== 59) {
        i++;
        continue;
      }
      const token = str.slice(i + 1, j);
      if (token.length === 0) {
        i++;
        continue;
      }
      let replacement;
      let tier;
      if (this._removeSet.has(token)) {
        replacement = "";
        if (tier === void 0) {
          tier = LIMIT_TIER_EXTERNAL;
        }
      } else if (this._leaveSet.has(token)) {
        i++;
        continue;
      } else if (token.charCodeAt(0) === 35) {
        const ncrResult = this._resolveNCR(token);
        if (ncrResult === void 0) {
          i++;
          continue;
        }
        replacement = ncrResult;
        tier = LIMIT_TIER_BASE;
      } else {
        const resolved = this._resolveName(token);
        replacement = resolved?.value;
        tier = resolved?.tier;
      }
      if (replacement === void 0) {
        i++;
        continue;
      }
      if (i > last) chunks.push(str.slice(last, i));
      chunks.push(replacement);
      last = j + 1;
      i = last;
      if (checkLimits && this._tierCounts(tier)) {
        if (limitExpansions) {
          this._totalExpansions++;
          if (this._totalExpansions > this._maxTotalExpansions) {
            throw new Error(
              `[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`
            );
          }
        }
        if (limitLength) {
          const delta = replacement.length - (token.length + 2);
          if (delta > 0) {
            this._expandedLength += delta;
            if (this._expandedLength > this._maxExpandedLength) {
              throw new Error(
                `[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`
              );
            }
          }
        }
      }
    }
    if (last < len) chunks.push(str.slice(last));
    const result = chunks.length === 0 ? str : chunks.join("");
    return this._postCheck(result, original);
  }
  // -------------------------------------------------------------------------
  // Private: limit tier check
  // -------------------------------------------------------------------------
  /**
   * Returns true if a resolved entity of the given tier should count
   * against the expansion/length limits.
   * @param {string} tier  — LIMIT_TIER_EXTERNAL | LIMIT_TIER_BASE
   * @returns {boolean}
   */
  _tierCounts(tier) {
    if (this._limitTiers.has(LIMIT_TIER_ALL)) return true;
    return this._limitTiers.has(tier);
  }
  // -------------------------------------------------------------------------
  // Private: entity resolution
  // -------------------------------------------------------------------------
  /**
   * Resolve a named entity token (without & and ;).
   * Priority: inputMap > externalMap > baseMap
   * Returns the resolved value tagged with its limit tier.
   *
   * @param {string} name
   * @returns {{ value: string, tier: string }|undefined}
   */
  _resolveName(name) {
    if (name in this._inputMap) return { value: this._inputMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._externalMap) return { value: this._externalMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._baseMap) return { value: this._baseMap[name], tier: LIMIT_TIER_BASE };
    return void 0;
  }
  /**
   * Classify a codepoint and return the minimum action level that must be applied.
   * Returns -1 when no minimum is imposed (normal allow path).
   *
   * Ranges checked (in priority order):
   *   1. U+0000            — null, governed by nullNCR (always ≥ remove)
   *   2. U+D800–U+DFFF     — surrogates, always prohibited (min: remove)
   *   3. U+0001–U+001F \ {0x09,0x0A,0x0D}  — XML 1.0 restricted C0 (min: remove)
   *      (skipped in XML 1.1 — C0 controls are allowed when written as NCRs)
   *
   * @param {number} cp  — codepoint
   * @returns {number}   — minimum NCR_LEVEL value, or -1 for no restriction
   */
  _classifyNCR(cp) {
    if (cp === 0) return this._ncrNullLevel;
    if (cp >= 55296 && cp <= 57343) return NCR_LEVEL.remove;
    if (this._ncrXmlVersion === 1) {
      if (cp >= 1 && cp <= 31 && !XML10_ALLOWED_C0.has(cp)) return NCR_LEVEL.remove;
    }
    return -1;
  }
  /**
   * Execute a resolved NCR action.
   *
   * @param {number} action   — NCR_LEVEL value
   * @param {string} token    — raw token (e.g. '#38') for error messages
   * @param {number} cp       — codepoint, used only for error messages
   * @returns {string|undefined}
   *   - decoded character string  → 'allow'
   *   - ''                        → 'remove'
   *   - undefined                 → 'leave' (caller must skip past '&' only)
   *   - throws Error              → 'throw'
   */
  _applyNCRAction(action, token, cp) {
    switch (action) {
      case NCR_LEVEL.allow:
        return String.fromCodePoint(cp);
      case NCR_LEVEL.remove:
        return "";
      case NCR_LEVEL.leave:
        return void 0;
      // signal: keep literal
      case NCR_LEVEL.throw:
        throw new Error(
          `[EntityDecoder] Prohibited numeric character reference &${token}; (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`
        );
      default:
        return String.fromCodePoint(cp);
    }
  }
  /**
   * Full NCR resolution pipeline for a numeric token.
   *
   * Steps:
   *   1. Parse the codepoint (decimal or hex).
   *   2. Validate the raw codepoint range (NaN, <0, >0x10FFFF).
   *   3. If numericAllowed is false and no minimum restriction applies → leave as-is.
   *   4. Classify the codepoint to find the minimum required action level.
   *   5. Resolve effective action = max(onNCR, minimum).
   *   6. Apply and return.
   *
   * @param {string} token  — e.g. '#38', '#x26', '#X26'
   * @returns {string|undefined}
   *   - string (incl. '')  — replacement ('' = remove)
   *   - undefined          — leave original &token; as-is
   */
  _resolveNCR(token) {
    const second = token.charCodeAt(1);
    let cp;
    if (second === 120 || second === 88) {
      cp = parseInt(token.slice(2), 16);
    } else {
      cp = parseInt(token.slice(1), 10);
    }
    if (Number.isNaN(cp) || cp < 0 || cp > 1114111) return void 0;
    const minimum = this._classifyNCR(cp);
    if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return void 0;
    const effective = minimum === -1 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, minimum);
    return this._applyNCRAction(effective, token, cp);
  }
};

// node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var defaultOnDangerousProperty = (name) => {
  if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return "__" + name;
  }
  return name;
};
var defaultOptions2 = {
  preserveOrder: false,
  attributeNamePrefix: "@_",
  attributesGroupName: false,
  textNodeName: "#text",
  ignoreAttributes: true,
  removeNSPrefix: false,
  // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false,
  //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true,
    unicode: false
  },
  tagValueProcessor: function(tagName, val) {
    return val;
  },
  attributeValueProcessor: function(attrName, val) {
    return val;
  },
  stopNodes: [],
  //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  entityDecoder: null,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function(tagName, jPath, attrs) {
    return tagName;
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
  strictReservedNames: true,
  jPath: true,
  // if true, pass jPath string to callbacks; if false, pass matcher instance
  onDangerousProperty: defaultOnDangerousProperty
};
function validatePropertyName(propertyName, optionName) {
  if (typeof propertyName !== "string") {
    return;
  }
  const normalized = propertyName.toLowerCase();
  if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
  if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
}
function normalizeProcessEntities(value, htmlEntities) {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      // true or false
      maxEntitySize: 1e4,
      maxExpansionDepth: 1e4,
      maxTotalExpansions: Infinity,
      maxExpandedLength: 1e5,
      maxEntityCount: 1e3,
      allowedTags: null,
      tagFilter: null,
      appliesTo: "all"
    };
  }
  if (typeof value === "object" && value !== null) {
    return {
      enabled: value.enabled !== false,
      maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
      maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 1e4),
      maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? Infinity),
      maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
      maxEntityCount: Math.max(1, value.maxEntityCount ?? 1e3),
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null,
      appliesTo: value.appliesTo ?? "all"
    };
  }
  return normalizeProcessEntities(true);
}
var buildOptions = function(options) {
  const built = Object.assign({}, defaultOptions2, options);
  const propertyNameOptions = [
    { value: built.attributeNamePrefix, name: "attributeNamePrefix" },
    { value: built.attributesGroupName, name: "attributesGroupName" },
    { value: built.textNodeName, name: "textNodeName" },
    { value: built.cdataPropName, name: "cdataPropName" },
    { value: built.commentPropName, name: "commentPropName" }
  ];
  for (const { value, name } of propertyNameOptions) {
    if (value) {
      validatePropertyName(value, name);
    }
  }
  if (built.onDangerousProperty === null) {
    built.onDangerousProperty = defaultOnDangerousProperty;
  }
  built.processEntities = normalizeProcessEntities(built.processEntities, built.htmlEntities);
  built.unpairedTagsSet = new Set(built.unpairedTags);
  if (built.stopNodes && Array.isArray(built.stopNodes)) {
    built.stopNodes = built.stopNodes.map((node) => {
      if (typeof node === "string" && node.startsWith("*.")) {
        return ".." + node.substring(2);
      }
      return node;
    });
  }
  return built;
};

// node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var METADATA_SYMBOL;
if (typeof Symbol !== "function") {
  METADATA_SYMBOL = "@@xmlMetadata";
} else {
  METADATA_SYMBOL = /* @__PURE__ */ Symbol("XML Node Metadata");
}
var XmlNode = class {
  constructor(tagname) {
    this.tagname = tagname;
    this.child = [];
    this[":@"] = /* @__PURE__ */ Object.create(null);
  }
  add(key, val) {
    if (key === "__proto__") key = "#__proto__";
    this.child.push({ [key]: val });
  }
  addChild(node, startIndex) {
    if (node.tagname === "__proto__") node.tagname = "#__proto__";
    if (node[":@"] && Object.keys(node[":@"]).length > 0) {
      this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
    } else {
      this.child.push({ [node.tagname]: node.child });
    }
    this.addStartIndex(startIndex);
  }
  addStartIndex(startIndex) {
    if (startIndex !== void 0) {
      this.child[this.child.length - 1][METADATA_SYMBOL] = { startIndex };
    }
  }
  addEndIndex(endIndex) {
    const lastChild = this.child[this.child.length - 1];
    if (lastChild !== void 0 && lastChild[METADATA_SYMBOL] !== void 0 && lastChild[METADATA_SYMBOL].endIndex === void 0) {
      lastChild[METADATA_SYMBOL].endIndex = endIndex;
    }
  }
  /** symbol used for metadata */
  static getMetaDataSymbol() {
    return METADATA_SYMBOL;
  }
};

// node_modules/xml-naming/src/index.js
var nameStartChar10 = ":A-Za-z_\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u0486\u0488-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
var nameChar10 = nameStartChar10 + "\\-\\.\\d\xB7\u0300-\u036F\u203F-\u2040";
var nameStartChar11 = ":A-Za-z_\xC0-\u02FF\u0370-\u037D\u037F-\u0486\u0488-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
var nameChar11 = nameStartChar11 + "\\-\\.\\d\xB7\u0300-\u036F\u0487\u203F-\u2040";
var buildRegexes = (startChar, char, flags = "") => {
  const ncStart = startChar.replace(":", "");
  const ncChar = char.replace(":", "");
  const ncNamePat = `[${ncStart}][${ncChar}]*`;
  return {
    name: new RegExp(`^[${startChar}][${char}]*$`, flags),
    ncName: new RegExp(`^${ncNamePat}$`, flags),
    qName: new RegExp(`^${ncNamePat}(?::${ncNamePat})?$`, flags),
    nmToken: new RegExp(`^[${char}]+$`, flags),
    nmTokens: new RegExp(`^[${char}]+(?:\\s+[${char}]+)*$`, flags)
  };
};
var regexes10 = buildRegexes(nameStartChar10, nameChar10);
var regexes11 = buildRegexes(nameStartChar11, nameChar11, "u");
var nameStartCharAscii = ":A-Za-z_";
var nameCharAscii = nameStartCharAscii + "\\-\\.\\d";
var regexesAscii = buildRegexes(nameStartCharAscii, nameCharAscii);
var getRegexes = (xmlVersion = "1.0", asciiOnly = false) => {
  if (asciiOnly) return regexesAscii;
  return xmlVersion === "1.1" ? regexes11 : regexes10;
};
var qName = (str, { xmlVersion = "1.0", asciiOnly = false } = {}) => getRegexes(xmlVersion, asciiOnly).qName.test(str);

// node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var DocTypeReader = class {
  constructor(options, xmlVersion) {
    this.suppressValidationErr = !options;
    this.options = options;
    this.xmlVersion = xmlVersion || 1;
  }
  setXmlVersion(xmlVersion = 1) {
    this.xmlVersion = xmlVersion;
  }
  readDocType(xmlData, i) {
    const entities = /* @__PURE__ */ Object.create(null);
    let entityCount = 0;
    if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
      i = i + 9;
      let angleBracketsCount = 1;
      let hasBody = false, comment = false;
      let quoteChar = null;
      let exp = "";
      for (; i < xmlData.length; i++) {
        if (quoteChar !== null) {
          if (xmlData[i] === quoteChar) quoteChar = null;
          exp += xmlData[i];
          continue;
        }
        if (!hasBody && !comment && (xmlData[i] === '"' || xmlData[i] === "'")) {
          quoteChar = xmlData[i];
          exp += xmlData[i];
          continue;
        }
        if (xmlData[i] === "<" && !comment) {
          if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
            i += 7;
            let entityName, val;
            [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
            if (val.indexOf("&") === -1) {
              if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) {
                throw new Error(
                  `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`
                );
              }
              entities[entityName] = val;
              entityCount++;
            }
          } else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
            i += 8;
            const { index } = this.readElementExp(xmlData, i + 1);
            i = index;
          } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
            i += 8;
          } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
            i += 9;
            const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
            i = index;
          } else if (hasSeq(xmlData, "!--", i)) comment = true;
          else throw new Error(`Invalid DOCTYPE`);
          angleBracketsCount++;
          exp = "";
        } else if (xmlData[i] === ">") {
          if (comment) {
            if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
              comment = false;
              angleBracketsCount--;
            }
          } else {
            angleBracketsCount--;
          }
          if (angleBracketsCount === 0) {
            break;
          }
        } else if (xmlData[i] === "[") {
          hasBody = true;
        } else {
          exp += xmlData[i];
        }
      }
      if (quoteChar !== null || angleBracketsCount !== 0) {
        throw new Error(`Unclosed DOCTYPE`);
      }
    } else {
      throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return { entities, i };
  }
  readEntityExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
      i++;
    }
    let entityName = xmlData.substring(startIndex, i);
    validateEntityName2(entityName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    if (!this.suppressValidationErr) {
      if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
        throw new Error("External entities are not supported");
      } else if (xmlData[i] === "%") {
        throw new Error("Parameter entities are not supported");
      }
    }
    let entityValue = "";
    [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
    if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) {
      throw new Error(
        `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
      );
    }
    i--;
    return [entityName, entityValue, i];
  }
  readNotationExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let notationName = xmlData.substring(startIndex, i);
    !this.suppressValidationErr && validateEntityName2(notationName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    const identifierType = xmlData.substring(i, i + 6).toUpperCase();
    if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
      throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
    }
    i += identifierType.length;
    i = skipWhitespace(xmlData, i);
    let publicIdentifier = null;
    let systemIdentifier = null;
    if (identifierType === "PUBLIC") {
      [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] === '"' || xmlData[i] === "'") {
        [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      }
    } else if (identifierType === "SYSTEM") {
      [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      if (!this.suppressValidationErr && !systemIdentifier) {
        throw new Error("Missing mandatory system identifier for SYSTEM notation");
      }
    }
    return { notationName, publicIdentifier, systemIdentifier, index: --i };
  }
  readIdentifierVal(xmlData, i, type2) {
    let identifierVal = "";
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
      throw new Error(`Expected quoted string, found "${startChar}"`);
    }
    i++;
    const startIndex = i;
    while (i < xmlData.length && xmlData[i] !== startChar) {
      i++;
    }
    identifierVal = xmlData.substring(startIndex, i);
    if (xmlData[i] !== startChar) {
      throw new Error(`Unterminated ${type2} value`);
    }
    i++;
    return [i, identifierVal];
  }
  readElementExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    if (!this.suppressValidationErr && !qName(elementName, { xmlVersion: this.xmlVersion })) {
      throw new Error(`Invalid element name: "${elementName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let contentModel = "";
    if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
    else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
    else if (xmlData[i] === "(") {
      i++;
      const startIndex2 = i;
      while (i < xmlData.length && xmlData[i] !== ")") {
        i++;
      }
      contentModel = xmlData.substring(startIndex2, i);
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated content model");
      }
    } else if (!this.suppressValidationErr) {
      throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
    }
    return {
      elementName,
      contentModel: contentModel.trim(),
      index: i
    };
  }
  readAttlistExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    let startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    validateEntityName2(elementName, { xmlVersion: this.xmlVersion });
    i = skipWhitespace(xmlData, i);
    startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let attributeName = xmlData.substring(startIndex, i);
    if (!validateEntityName2(attributeName, { xmlVersion: this.xmlVersion })) {
      throw new Error(`Invalid attribute name: "${attributeName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let attributeType = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
      attributeType = "NOTATION";
      i += 8;
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] !== "(") {
        throw new Error(`Expected '(', found "${xmlData[i]}"`);
      }
      i++;
      let allowedNotations = [];
      while (i < xmlData.length && xmlData[i] !== ")") {
        const startIndex2 = i;
        while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
          i++;
        }
        let notation = xmlData.substring(startIndex2, i);
        notation = notation.trim();
        if (!validateEntityName2(notation, { xmlVersion: this.xmlVersion })) {
          throw new Error(`Invalid notation name: "${notation}"`);
        }
        allowedNotations.push(notation);
        if (xmlData[i] === "|") {
          i++;
          i = skipWhitespace(xmlData, i);
        }
      }
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated list of notations");
      }
      i++;
      attributeType += " (" + allowedNotations.join("|") + ")";
    } else {
      const startIndex2 = i;
      while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        i++;
      }
      attributeType += xmlData.substring(startIndex2, i);
      const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
      if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
        throw new Error(`Invalid attribute type: "${attributeType}"`);
      }
    }
    i = skipWhitespace(xmlData, i);
    let defaultValue = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
      defaultValue = "#REQUIRED";
      i += 8;
    } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
      defaultValue = "#IMPLIED";
      i += 7;
    } else {
      [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
    }
    return {
      elementName,
      attributeName,
      attributeType,
      defaultValue,
      index: i
    };
  }
};
var skipWhitespace = (data, index) => {
  while (index < data.length && /\s/.test(data[index])) {
    index++;
  }
  return index;
};
function hasSeq(data, seq, i) {
  for (let j = 0; j < seq.length; j++) {
    if (seq[j] !== data[i + j + 1]) return false;
  }
  return true;
}
function validateEntityName2(name, xmlVersion) {
  if (qName(name, { xmlVersion }))
    return name;
  else
    throw new Error(`Invalid entity name ${name}`);
}

// node_modules/anynum/digitTable.js
var SCRIPT_ZEROS = [
  // Basic Latin (ASCII) — included for completeness / pass-through
  48,
  // 0-9
  // Arabic scripts
  1632,
  // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
  1776,
  // Extended Arabic-Indic (Urdu/Persian/Sindhi) ۰۱۲۳
  // Indic scripts
  2406,
  // Devanagari ०१२३४५६७८९
  2534,
  // Bengali ০১২৩৪৫৬৭৮৯
  2662,
  // Gurmukhi ੦੧੨੩੪੫੬੭੮੯
  2790,
  // Gujarati ૦૧૨૩૪૫૬૭૮૯
  2918,
  // Odia ୦୧୨୩୪୫୬୭୮୯
  3046,
  // Tamil ௦௧௨௩௪௫௬௭௮௯
  3174,
  // Telugu ౦౧౨౩౪౫౬౭౮౯
  3302,
  // Kannada ೦೧೨೩೪೫೬೭೮೯
  3430,
  // Malayalam ൦൧൨൩൪൫൬൭൮൯
  3558,
  // Sinhala Archaic ෦෧෨෩෪෫෬෭෮෯
  // Southeast Asian scripts
  3664,
  // Thai ๐๑๒๓๔๕๖๗๘๙
  3792,
  // Lao ໐໑໒໓໔໕໖໗໘໙
  3872,
  // Tibetan ༠༡༢༣༤༥༦༧༨༩
  4160,
  // Myanmar ၀၁၂၃၄၅၆၇၈၉
  4240,
  // Myanmar Shan ႐႑႒႓႔႕႖႗႘႙
  6112,
  // Khmer ០១២៣៤៥៦៧៨៩
  6160,
  // Mongolian ᠐᠑᠒᠓᠔᠕᠖᠗᠘᠙
  6470,
  // Limbu ᥆᥇᥈᥉᥊᥋᥌᥍᥎᥏
  6608,
  // New Tai Lue ᧐᧑᧒᧓᧔᧕᧖᧗᧘᧙
  6784,
  // Tai Tham Hora ᪀᪁᪂᪃᪄᪅᪆᪇᪈᪉
  6800,
  // Tai Tham Tham ᪐᪑᪒᪓᪔᪕᪖᪗᪘᪙
  6992,
  // Balinese ᭐᭑᭒᭓᭔᭕᭖᭗᭘᭙
  7088,
  // Sundanese ᮰᮱᮲᮳᮴᮵᮶᮷᮸᮹
  7232,
  // Lepcha ᱀᱁᱂᱃᱄᱅᱆᱇᱈᱉
  7248,
  // Ol Chiki ᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙
  // Fullwidth (CJK context)
  65296,
  // Fullwidth ０１２３４５６７８９
  // Mathematical digit variants (Unicode math block)
  120782,
  // Mathematical Bold
  120792,
  // Mathematical Double-Struck
  120802,
  // Mathematical Sans-Serif
  120812,
  // Mathematical Sans-Serif Bold
  120822,
  // Mathematical Monospace
  // Other scripts
  66720,
  // Osmanya 𐒠𐒡𐒢𐒣𐒤𐒥𐒦𐒧𐒨𐒩
  68912,
  // Hanifi Rohingya 𐴰𐴱𐴲𐴳𐴴𐴵𐴶𐴷𐴸𐴹
  69734,
  // Brahmi 𑁦𑁧𑁨𑁩𑁪𑁫𑁬𑁭𑁮𑁯
  69872,
  // Sora Sompeng 𑃰𑃱𑃲𑃳𑃴𑃵𑃶𑃷𑃸𑃹
  69942,
  // Chakma 𑄶𑄷𑄸𑄹𑄺𑄻𑄼𑄽𑄾𑄿
  70096,
  // Sharada 𑇐𑇑𑇒𑇓𑇔𑇕𑇖𑇗𑇘𑇙
  70384,
  // Khudawadi 𑋰𑋱𑋲𑋳𑋴𑋵𑋶𑋷𑋸𑋹
  70736,
  // Newa 𑑐𑑑𑑒𑑓𑑔𑑕𑑖𑑗𑑘𑑙
  70864,
  // Tirhuta 𑓐𑓑𑓒𑓓𑓔𑓕𑓖𑓗𑓘𑓙
  71248,
  // Modi 𑙐𑙑𑙒𑙓𑙔𑙕𑙖𑙗𑙘𑙙
  71360,
  // Takri 𑛀𑛁𑛂𑛃𑛄𑛅𑛆𑛇𑛈𑛉
  71472,
  // Ahom 𑜰𑜱𑜲𑜳𑜴𑜵𑜶𑜷𑜸𑜹
  71904,
  // Warang Citi 𑣠𑣡𑣢𑣣𑣤𑣥𑣦𑣧𑣨𑣩
  72016,
  // Dives Akuru 𑥐𑥑𑥒𑥓𑥔𑥕𑥖𑥗𑥘𑥙
  72688,
  // Khitan Small Script 𑯰𑯱𑯲𑯳𑯴𑯵𑯶𑯷𑯸𑯹
  72784,
  // Bhaiksuki 𑱐𑱑𑱒𑱓𑱔𑱕𑱖𑱗𑱘𑱙
  73040,
  // Masaram Gondi 𑵐𑵑𑵒𑵓𑵔𑵕𑵖𑵗𑵘𑵙
  73120,
  // Gunjala Gondi 𑶠𑶡𑶢𑶣𑶤𑶥𑶦𑶧𑶨𑶩
  73552,
  // Kawi 𑽐𑽑𑽒𑽓𑽔𑽕𑽖𑽗𑽘𑽙
  92768,
  // Mro 𖩠𖩡𖩢𖩣𖩤𖩥𖩦𖩧𖩨𖩩
  92864,
  // Tangsa 𖫀𖫁𖫂𖫃𖫄𖫅𖫆𖫇𖫈𖫉
  93008,
  // Pahawh Hmong 𖭐𖭑𖭒𖭓𖭔𖭕𖭖𖭗𖭘𖭙
  123200,
  // Nyiakeng Puachue Hmong 𞅀𞅁𞅂𞅃𞅄𞅅𞅆𞅇𞅈𞅉
  123632,
  // Wancho 𞋰𞋱𞋲𞋳𞋴𞋵𞋶𞋷𞋸𞋹
  124144,
  // Nag Mundari 𞓰𞓱𞓲𞓳𞓴𞓵𞓶𞓷𞓸𞓹
  125264,
  // Adlam 𞥐𞥑𞥒𞥓𞥔𞥕𞥖𞥗𞥘𞥙
  130032
  // Segmented digit symbols 🯰🯱🯲🯳🯴🯵🯶🯷🯸🯹
];
var NOT_DIGIT = 255;
var HIGH_MAP = /* @__PURE__ */ new Map();
var LOW_MAX = 65535;
var LOW_MIN = 1632;
var TABLE_OFFSET = LOW_MIN;
var TABLE_SIZE = LOW_MAX - LOW_MIN + 1;
var TABLE = new Uint8Array(TABLE_SIZE).fill(NOT_DIGIT);
for (const zero of SCRIPT_ZEROS) {
  for (let d = 0; d < 10; d++) {
    const cp = zero + d;
    if (cp <= LOW_MAX) {
      TABLE[cp - TABLE_OFFSET] = d;
    } else {
      HIGH_MAP.set(cp, d);
    }
  }
}

// node_modules/anynum/anynum.js
var CHAR_0 = 48;
var CHAR_9 = 57;
var CHAR_MINUS = 45;
var MINUS_SET = /* @__PURE__ */ new Set([8722, 65293, 65123]);
function anynum(str) {
  if (typeof str !== "string") return str;
  const len = str.length;
  if (len === 0) return str;
  let firstHit = -1;
  for (let i = 0; i < len; i++) {
    const cc = str.charCodeAt(i);
    if (cc >= CHAR_0 && cc <= CHAR_9 || cc === CHAR_MINUS) continue;
    if (cc < TABLE_OFFSET) {
      if (MINUS_SET.has(cc)) {
        firstHit = i;
        break;
      }
      continue;
    }
    if (cc >= 55296 && cc <= 56319) {
      if (i + 1 < len) {
        const low = str.charCodeAt(i + 1);
        if (low >= 56320 && low <= 57343) {
          const cp = 65536 + (cc - 55296 << 10) + (low - 56320);
          if (HIGH_MAP.has(cp)) {
            firstHit = i;
            break;
          }
        }
      }
      continue;
    }
    if (TABLE[cc - TABLE_OFFSET] !== NOT_DIGIT || MINUS_SET.has(cc)) {
      firstHit = i;
      break;
    }
  }
  if (firstHit === -1) return str;
  const chars = [];
  if (firstHit > 0) chars.push(str.slice(0, firstHit));
  for (let i = firstHit; i < len; i++) {
    const cc = str.charCodeAt(i);
    if (cc >= CHAR_0 && cc <= CHAR_9 || cc === CHAR_MINUS) {
      chars.push(str[i]);
      continue;
    }
    if (cc < TABLE_OFFSET) {
      chars.push(MINUS_SET.has(cc) ? "-" : str[i]);
      continue;
    }
    if (cc >= 55296 && cc <= 56319) {
      if (i + 1 < len) {
        const low = str.charCodeAt(i + 1);
        if (low >= 56320 && low <= 57343) {
          const cp = 65536 + (cc - 55296 << 10) + (low - 56320);
          const d2 = HIGH_MAP.get(cp);
          if (d2 !== void 0) {
            chars.push(String.fromCharCode(d2 + 48));
            i++;
            continue;
          }
        }
      }
      chars.push(str[i]);
      continue;
    }
    if (MINUS_SET.has(cc)) {
      chars.push("-");
      continue;
    }
    const d = TABLE[cc - TABLE_OFFSET];
    chars.push(d !== NOT_DIGIT ? String.fromCharCode(d + 48) : str[i]);
  }
  return chars.join("");
}
var anynum_default = anynum;

// node_modules/strnum/strnum.js
var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
var binRegex = /^0b[01]+$/;
var octRegex = /^0o[0-7]+$/;
var numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
var consider = {
  hex: true,
  binary: false,
  octal: false,
  leadingZeros: true,
  decimalPoint: ".",
  eNotation: true,
  //skipLike: /regex/,
  infinity: "original",
  // "null", "infinity" (Infinity type), "string" ("Infinity" (the string literal))
  unicode: false
};
function toNumber(str, options = {}) {
  options = Object.assign({}, consider, options);
  if (!str || typeof str !== "string") return str;
  let trimmedStr = str.trim();
  if (trimmedStr.length === 0) return str;
  else if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
  else if (trimmedStr === "0") return 0;
  if (options.unicode) {
    trimmedStr = anynum_default(trimmedStr);
    if (trimmedStr === "0") return 0;
  }
  if (options.hex && hexRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 16);
  } else if (options.binary && binRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 2);
  } else if (options.octal && octRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 8);
  } else if (!isFinite(trimmedStr)) {
    const num2 = Number(trimmedStr);
    if (Number.isNaN(num2)) return str;
    return handleInfinity(str, num2, options);
  } else if (trimmedStr.includes("e") || trimmedStr.includes("E")) {
    return resolveEnotation(str, trimmedStr, options);
  } else {
    const match = numRegex.exec(trimmedStr);
    if (match) {
      const sign = match[1] || "";
      const leadingZeros = match[2];
      let numTrimmedByZeros = trimZeros(match[3]);
      const decimalAdjacentToLeadingZeros = sign ? (
        // 0., -00., 000.
        trimmedStr[leadingZeros.length + 1] === "."
      ) : trimmedStr[leadingZeros.length] === ".";
      if (!options.leadingZeros && (leadingZeros.length > 1 || leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros)) {
        return str;
      } else {
        const num2 = Number(trimmedStr);
        const parsedStr = String(num2);
        if (num2 === 0) return num2;
        if (parsedStr.search(/[eE]/) !== -1) {
          if (options.eNotation) return num2;
          else return str;
        } else if (trimmedStr.indexOf(".") !== -1) {
          if (parsedStr === "0") return num2;
          else if (parsedStr === numTrimmedByZeros) return num2;
          else if (parsedStr === `${sign}${numTrimmedByZeros}`) return num2;
          else return str;
        }
        let n = leadingZeros ? numTrimmedByZeros : trimmedStr;
        if (leadingZeros) {
          return n === parsedStr || sign + n === parsedStr ? num2 : str;
        } else {
          return n === parsedStr || n === sign + parsedStr ? num2 : str;
        }
      }
    } else {
      return str;
    }
  }
}
var eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
function resolveEnotation(str, trimmedStr, options) {
  if (!options.eNotation) return str;
  const notation = trimmedStr.match(eNotationRegx);
  if (notation) {
    let sign = notation[1] || "";
    const eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
    const leadingZeros = notation[2];
    const eAdjacentToLeadingZeros = sign ? (
      // 0E.
      trimmedStr[leadingZeros.length + 1] === eChar
    ) : trimmedStr[leadingZeros.length] === eChar;
    if (leadingZeros.length > 1 && eAdjacentToLeadingZeros) return str;
    else if (leadingZeros.length === 1 && (notation[3].startsWith(`.${eChar}`) || notation[3][0] === eChar)) {
      return Number(trimmedStr);
    } else if (leadingZeros.length > 0) {
      if (options.leadingZeros && !eAdjacentToLeadingZeros) {
        return Number(trimmedStr);
      } else return str;
    } else {
      return Number(trimmedStr);
    }
  } else {
    return str;
  }
}
function trimZeros(numStr) {
  if (numStr && numStr.indexOf(".") !== -1) {
    let end = numStr.length;
    while (end > 0 && numStr.charCodeAt(end - 1) === 48) end--;
    numStr = numStr.slice(0, end);
    if (numStr === ".") numStr = "0";
    else if (numStr[0] === ".") numStr = "0" + numStr;
    else if (numStr[numStr.length - 1] === ".") numStr = numStr.substring(0, numStr.length - 1);
    return numStr;
  }
  return numStr;
}
function parse_int(numStr, base) {
  const str = numStr.trim();
  if (base === 2 || base === 8) numStr = str.substring(2);
  if (parseInt) return parseInt(numStr, base);
  else if (Number.parseInt) return Number.parseInt(numStr, base);
  else if (window && window.parseInt) return window.parseInt(numStr, base);
  else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
}
function handleInfinity(str, num2, options) {
  const isPositive = num2 === Infinity;
  switch (options.infinity.toLowerCase()) {
    case "null":
      return null;
    case "infinity":
      return num2;
    // Return Infinity or -Infinity
    case "string":
      return isPositive ? "Infinity" : "-Infinity";
    case "original":
    default:
      return str;
  }
}

// node_modules/fast-xml-parser/src/ignoreAttributes.js
function getIgnoreAttributesFn(ignoreAttributes) {
  if (typeof ignoreAttributes === "function") {
    return ignoreAttributes;
  }
  if (Array.isArray(ignoreAttributes)) {
    return (attrName) => {
      for (const pattern of ignoreAttributes) {
        if (typeof pattern === "string" && attrName === pattern) {
          return true;
        }
        if (pattern instanceof RegExp && pattern.test(attrName)) {
          return true;
        }
      }
    };
  }
  return () => false;
}

// node_modules/path-expression-matcher/src/Expression.js
var Expression = class {
  /**
   * Create a new Expression
   * @param {string} pattern - Pattern string (e.g., "root.users.user", "..user[id]")
   * @param {Object} options - Configuration options
   * @param {string} options.separator - Path separator (default: '.')
   */
  constructor(pattern, options = {}, data) {
    this.pattern = pattern;
    this.separator = options.separator || ".";
    this.segments = this._parse(pattern);
    this.data = data;
    this._hasDeepWildcard = this.segments.some((seg) => seg.type === "deep-wildcard");
    this._hasAttributeCondition = this.segments.some((seg) => seg.attrName !== void 0);
    this._hasPositionSelector = this.segments.some((seg) => seg.position !== void 0);
  }
  /**
   * Parse pattern string into segments
   * @private
   * @param {string} pattern - Pattern to parse
   * @returns {Array} Array of segment objects
   */
  _parse(pattern) {
    const segments = [];
    let i = 0;
    let currentPart = "";
    while (i < pattern.length) {
      if (pattern[i] === this.separator) {
        if (i + 1 < pattern.length && pattern[i + 1] === this.separator) {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
            currentPart = "";
          }
          segments.push({ type: "deep-wildcard" });
          i += 2;
        } else {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
          }
          currentPart = "";
          i++;
        }
      } else {
        currentPart += pattern[i];
        i++;
      }
    }
    if (currentPart.trim()) {
      segments.push(this._parseSegment(currentPart.trim()));
    }
    return segments;
  }
  /**
   * Parse a single segment
   * @private
   * @param {string} part - Segment string (e.g., "user", "ns::user", "user[id]", "ns::user:first")
   * @returns {Object} Segment object
   */
  _parseSegment(part) {
    const segment = { type: "tag" };
    let bracketContent = null;
    let withoutBrackets = part;
    const bracketMatch = part.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
    if (bracketMatch) {
      withoutBrackets = bracketMatch[1] + bracketMatch[3];
      if (bracketMatch[2]) {
        const content = bracketMatch[2].slice(1, -1);
        if (content) {
          bracketContent = content;
        }
      }
    }
    let namespace = void 0;
    let tagAndPosition = withoutBrackets;
    if (withoutBrackets.includes("::")) {
      const nsIndex = withoutBrackets.indexOf("::");
      namespace = withoutBrackets.substring(0, nsIndex).trim();
      tagAndPosition = withoutBrackets.substring(nsIndex + 2).trim();
      if (!namespace) {
        throw new Error(`Invalid namespace in pattern: ${part}`);
      }
    }
    let tag = void 0;
    let positionMatch = null;
    if (tagAndPosition.includes(":")) {
      const colonIndex = tagAndPosition.lastIndexOf(":");
      const tagPart = tagAndPosition.substring(0, colonIndex).trim();
      const posPart = tagAndPosition.substring(colonIndex + 1).trim();
      const isPositionKeyword = ["first", "last", "odd", "even"].includes(posPart) || /^nth\(\d+\)$/.test(posPart);
      if (isPositionKeyword) {
        tag = tagPart;
        positionMatch = posPart;
      } else {
        tag = tagAndPosition;
      }
    } else {
      tag = tagAndPosition;
    }
    if (!tag) {
      throw new Error(`Invalid segment pattern: ${part}`);
    }
    segment.tag = tag;
    if (namespace) {
      segment.namespace = namespace;
    }
    if (bracketContent) {
      if (bracketContent.includes("=")) {
        const eqIndex = bracketContent.indexOf("=");
        segment.attrName = bracketContent.substring(0, eqIndex).trim();
        segment.attrValue = bracketContent.substring(eqIndex + 1).trim();
      } else {
        segment.attrName = bracketContent.trim();
      }
    }
    if (positionMatch) {
      const nthMatch = positionMatch.match(/^nth\((\d+)\)$/);
      if (nthMatch) {
        segment.position = "nth";
        segment.positionValue = parseInt(nthMatch[1], 10);
      } else {
        segment.position = positionMatch;
      }
    }
    return segment;
  }
  /**
   * Get the number of segments
   * @returns {number}
   */
  get length() {
    return this.segments.length;
  }
  /**
   * Check if expression contains deep wildcard
   * @returns {boolean}
   */
  hasDeepWildcard() {
    return this._hasDeepWildcard;
  }
  /**
   * Check if expression has attribute conditions
   * @returns {boolean}
   */
  hasAttributeCondition() {
    return this._hasAttributeCondition;
  }
  /**
   * Check if expression has position selectors
   * @returns {boolean}
   */
  hasPositionSelector() {
    return this._hasPositionSelector;
  }
  /**
   * Get string representation
   * @returns {string}
   */
  toString() {
    return this.pattern;
  }
};

// node_modules/path-expression-matcher/src/ExpressionSet.js
var ExpressionSet = class {
  constructor() {
    this._byDepthAndTag = /* @__PURE__ */ new Map();
    this._wildcardByDepth = /* @__PURE__ */ new Map();
    this._deepWildcards = [];
    this._deepByTerminalTag = /* @__PURE__ */ new Map();
    this._patterns = /* @__PURE__ */ new Set();
    this._sealed = false;
  }
  /**
   * Add an Expression to the set.
   * Duplicate patterns (same pattern string) are silently ignored.
   *
   * @param {import('./Expression.js').default} expression - A pre-constructed Expression instance
   * @returns {this} for chaining
   * @throws {TypeError} if called after seal()
   *
   * @example
   * set.add(new Expression('root.users.user'));
   * set.add(new Expression('..script'));
   */
  add(expression) {
    if (this._sealed) {
      throw new TypeError(
        "ExpressionSet is sealed. Create a new ExpressionSet to add more expressions."
      );
    }
    if (this._patterns.has(expression.pattern)) return this;
    this._patterns.add(expression.pattern);
    if (expression.hasDeepWildcard()) {
      const lastSeg2 = expression.segments[expression.segments.length - 1];
      if (lastSeg2 && lastSeg2.type !== "deep-wildcard" && lastSeg2.tag !== "*") {
        const tag2 = lastSeg2.tag;
        if (!this._deepByTerminalTag.has(tag2)) this._deepByTerminalTag.set(tag2, []);
        this._deepByTerminalTag.get(tag2).push(expression);
      } else {
        this._deepWildcards.push(expression);
      }
      return this;
    }
    const depth = expression.length;
    const lastSeg = expression.segments[expression.segments.length - 1];
    const tag = lastSeg?.tag;
    if (!tag || tag === "*") {
      if (!this._wildcardByDepth.has(depth)) this._wildcardByDepth.set(depth, []);
      this._wildcardByDepth.get(depth).push(expression);
    } else {
      const key = `${depth}:${tag}`;
      if (!this._byDepthAndTag.has(key)) this._byDepthAndTag.set(key, []);
      this._byDepthAndTag.get(key).push(expression);
    }
    return this;
  }
  /**
   * Add multiple expressions at once.
   *
   * @param {import('./Expression.js').default[]} expressions - Array of Expression instances
   * @returns {this} for chaining
   *
   * @example
   * set.addAll([
   *   new Expression('root.users.user'),
   *   new Expression('root.config.setting'),
   * ]);
   */
  addAll(expressions) {
    for (const expr of expressions) this.add(expr);
    return this;
  }
  /**
   * Check whether a pattern string is already present in the set.
   *
   * @param {import('./Expression.js').default} expression
   * @returns {boolean}
   */
  has(expression) {
    return this._patterns.has(expression.pattern);
  }
  /**
   * Number of expressions in the set.
   * @type {number}
   */
  get size() {
    return this._patterns.size;
  }
  /**
   * Seal the set against further modifications.
   * Useful to prevent accidental mutations after config is built.
   * Calling add() or addAll() on a sealed set throws a TypeError.
   *
   * @returns {this}
   */
  seal() {
    this._sealed = true;
    return this;
  }
  /**
   * Whether the set has been sealed.
   * @type {boolean}
   */
  get isSealed() {
    return this._sealed;
  }
  /**
   * Test whether the matcher's current path matches any expression in the set.
   *
   * Evaluation order (cheapest → most expensive):
   *  1. Exact depth + tag bucket  — O(1) lookup, typically 0–2 expressions
   *  2. Depth-only wildcard bucket — O(1) lookup, rare
   *  3. Deep-wildcard list         — always checked, but usually small
   *
   * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
   * @returns {boolean} true if any expression matches the current path
   *
   * @example
   * if (stopNodes.matchesAny(matcher)) {
   *   // handle stop node
   * }
   */
  matchesAny(matcher) {
    return this.findMatch(matcher) !== null;
  }
  /**
  * Find and return the first Expression that matches the matcher's current path.
  *
  * Uses the same evaluation order as matchesAny (cheapest → most expensive):
  *  1. Exact depth + tag bucket
  *  2. Depth-only wildcard bucket
  *  3. Deep-wildcard list
  *
  * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
  * @returns {import('./Expression.js').default | null} the first matching Expression, or null
  *
  * @example
  * const expr = stopNodes.findMatch(matcher);
  * if (expr) {
  *   // access expr.config, expr.pattern, etc.
  * }
  */
  findMatch(matcher) {
    const depth = matcher.getDepth();
    const tag = matcher.getCurrentTag();
    const exactKey = `${depth}:${tag}`;
    const exactBucket = this._byDepthAndTag.get(exactKey);
    if (exactBucket) {
      for (let i = 0; i < exactBucket.length; i++) {
        if (matcher.matches(exactBucket[i])) return exactBucket[i];
      }
    }
    const wildcardBucket = this._wildcardByDepth.get(depth);
    if (wildcardBucket) {
      for (let i = 0; i < wildcardBucket.length; i++) {
        if (matcher.matches(wildcardBucket[i])) return wildcardBucket[i];
      }
    }
    const deepBucket = this._deepByTerminalTag.get(tag);
    if (deepBucket) {
      for (let i = 0; i < deepBucket.length; i++) {
        if (matcher.matches(deepBucket[i])) return deepBucket[i];
      }
    }
    for (let i = 0; i < this._deepWildcards.length; i++) {
      if (matcher.matches(this._deepWildcards[i])) return this._deepWildcards[i];
    }
    return null;
  }
};

// node_modules/path-expression-matcher/src/Matcher.js
var MatcherView = class {
  /**
   * @param {Matcher} matcher - The parent Matcher instance to read from.
   */
  constructor(matcher) {
    this._matcher = matcher;
  }
  /**
   * Get the path separator used by the parent matcher.
   * @returns {string}
   */
  get separator() {
    return this._matcher.separator;
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    const path19 = this._matcher.path;
    return path19.length > 0 ? path19[path19.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    const path19 = this._matcher.path;
    return path19.length > 0 ? path19[path19.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    const path19 = this._matcher.path;
    if (path19.length === 0) return void 0;
    return path19[path19.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    const path19 = this._matcher.path;
    if (path19.length === 0) return false;
    const current = path19[path19.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get the value of a "kept" attribute from the nearest ancestor (or
   * current node) that declared it via `push(tag, attrs, ns, { keep: [...] })`.
   * @param {string} attrName
   * @returns {*}
   */
  getAnyParentAttr(attrName) {
    return this._matcher.getAnyParentAttr(attrName);
  }
  /**
   * Check whether any ancestor (or the current node) kept the given
   * attribute via `push(tag, attrs, ns, { keep: [...] })`.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAnyParentAttr(attrName) {
    return this._matcher.hasAnyParentAttr(attrName);
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    const path19 = this._matcher.path;
    if (path19.length === 0) return -1;
    return path19[path19.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    const path19 = this._matcher.path;
    if (path19.length === 0) return -1;
    return path19[path19.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this._matcher.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    return this._matcher.toString(separator, includeNamespace);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this._matcher.path.map((n) => n.tag);
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    return this._matcher.matches(expression);
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this._matcher);
  }
};
var Matcher = class {
  /**
   * Create a new Matcher.
   * @param {Object} [options={}]
   * @param {string} [options.separator='.'] - Default path separator
   */
  constructor(options = {}) {
    this.separator = options.separator || ".";
    this.path = [];
    this.siblingStacks = [];
    this._pathStringCache = null;
    this._view = new MatcherView(this);
    this._keptAttrs = [];
  }
  /**
   * Push a new tag onto the path.
   * @param {string} tagName
   * @param {Object|null} [attrValues=null]
   * @param {string|null} [namespace=null]
   * @param {Object|null} [options=null]
   * @param {string[]} [options.keep] - Names of attributes (from attrValues)
   */
  push(tagName, attrValues = null, namespace = null, options = null) {
    this._pathStringCache = null;
    if (this.path.length > 0) {
      this.path[this.path.length - 1].values = void 0;
    }
    const currentLevel = this.path.length;
    let level = this.siblingStacks[currentLevel];
    if (!level) {
      level = { counts: /* @__PURE__ */ new Map(), total: 0 };
      this.siblingStacks[currentLevel] = level;
    }
    const siblingKey = namespace ? `${namespace}:${tagName}` : tagName;
    const counter = level.counts.get(siblingKey) || 0;
    const position = level.total;
    level.counts.set(siblingKey, counter + 1);
    level.total++;
    const node = {
      tag: tagName,
      position,
      counter
    };
    if (namespace !== null && namespace !== void 0) {
      node.namespace = namespace;
    }
    if (attrValues !== null && attrValues !== void 0) {
      node.values = attrValues;
    }
    this.path.push(node);
    const depth = this.path.length;
    const keep = options !== null ? options.keep : null;
    if (keep !== null && keep !== void 0 && keep.length > 0 && attrValues) {
      for (let i = 0; i < keep.length; i++) {
        const name = keep[i];
        if (attrValues[name] !== void 0) {
          this._keptAttrs.push({ depth, name, value: attrValues[name] });
        }
      }
    }
  }
  /**
   * Pop the last tag from the path.
   * @returns {Object|undefined} The popped node
   */
  pop() {
    if (this.path.length === 0) return void 0;
    this._pathStringCache = null;
    const node = this.path.pop();
    if (this.siblingStacks.length > this.path.length + 1) {
      this.siblingStacks.length = this.path.length + 1;
    }
    const poppedDepth = this.path.length + 1;
    while (this._keptAttrs.length > 0 && this._keptAttrs[this._keptAttrs.length - 1].depth >= poppedDepth) {
      this._keptAttrs.pop();
    }
    return node;
  }
  /**
   * Update current node's attribute values.
   * Useful when attributes are parsed after push.
   * @param {Object} attrValues
   */
  updateCurrent(attrValues) {
    if (this.path.length > 0) {
      const current = this.path[this.path.length - 1];
      if (attrValues !== null && attrValues !== void 0) {
        current.values = attrValues;
      }
    }
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    if (this.path.length === 0) return void 0;
    return this.path[this.path.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    if (this.path.length === 0) return false;
    const current = this.path[this.path.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get the value of a "kept" attribute from the nearest ancestor (or
   * current node) that declared it via `push(tag, attrs, ns, { keep: [...] })`.
   * Unlike getAttrValue(), this works regardless of how deep the path has
   * gone since the attribute was pushed — but only for attribute names that
   * were explicitly marked with `keep` at push time. Cost is proportional to
   * the number of currently-kept attributes (typically 0-3), not path depth.
   * @param {string} attrName
   * @returns {*} the value, or undefined if no ancestor kept this attribute
   */
  getAnyParentAttr(attrName) {
    const kept = this._keptAttrs;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (kept[i].name === attrName) return kept[i].value;
    }
    return void 0;
  }
  /**
   * Check whether any ancestor (or the current node) kept the given
   * attribute via `push(tag, attrs, ns, { keep: [...] })`.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAnyParentAttr(attrName) {
    const kept = this._keptAttrs;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (kept[i].name === attrName) return true;
    }
    return false;
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    const sep6 = separator || this.separator;
    const isDefault = sep6 === this.separator && includeNamespace === true;
    if (isDefault) {
      if (this._pathStringCache !== null) {
        return this._pathStringCache;
      }
      const result = this.path.map(
        (n) => n.namespace ? `${n.namespace}:${n.tag}` : n.tag
      ).join(sep6);
      this._pathStringCache = result;
      return result;
    }
    return this.path.map(
      (n) => includeNamespace && n.namespace ? `${n.namespace}:${n.tag}` : n.tag
    ).join(sep6);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this.path.map((n) => n.tag);
  }
  /**
   * Reset the path to empty.
   */
  reset() {
    this._pathStringCache = null;
    this.path = [];
    this.siblingStacks = [];
    this._keptAttrs = [];
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    const segments = expression.segments;
    if (segments.length === 0) {
      return false;
    }
    if (expression.hasDeepWildcard()) {
      return this._matchWithDeepWildcard(segments);
    }
    return this._matchSimple(segments);
  }
  /**
   * @private
   */
  _matchSimple(segments) {
    if (this.path.length !== segments.length) {
      return false;
    }
    for (let i = 0; i < segments.length; i++) {
      if (!this._matchSegment(segments[i], this.path[i], i === this.path.length - 1)) {
        return false;
      }
    }
    return true;
  }
  /**
   * @private
   */
  _matchWithDeepWildcard(segments) {
    let pathIdx = this.path.length - 1;
    let segIdx = segments.length - 1;
    while (segIdx >= 0 && pathIdx >= 0) {
      const segment = segments[segIdx];
      if (segment.type === "deep-wildcard") {
        segIdx--;
        if (segIdx < 0) {
          return true;
        }
        const nextSeg = segments[segIdx];
        let found = false;
        for (let i = pathIdx; i >= 0; i--) {
          if (this._matchSegment(nextSeg, this.path[i], i === this.path.length - 1)) {
            pathIdx = i - 1;
            segIdx--;
            found = true;
            break;
          }
        }
        if (!found) {
          return false;
        }
      } else {
        if (!this._matchSegment(segment, this.path[pathIdx], pathIdx === this.path.length - 1)) {
          return false;
        }
        pathIdx--;
        segIdx--;
      }
    }
    return segIdx < 0;
  }
  /**
   * @private
   */
  _matchSegment(segment, node, isCurrentNode) {
    if (segment.tag !== "*" && segment.tag !== node.tag) {
      return false;
    }
    if (segment.namespace !== void 0) {
      if (segment.namespace !== "*" && segment.namespace !== node.namespace) {
        return false;
      }
    }
    if (segment.attrName !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      if (!node.values || !(segment.attrName in node.values)) {
        return false;
      }
      if (segment.attrValue !== void 0) {
        if (String(node.values[segment.attrName]) !== String(segment.attrValue)) {
          return false;
        }
      }
    }
    if (segment.position !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      const counter = node.counter ?? 0;
      if (segment.position === "first" && counter !== 0) {
        return false;
      } else if (segment.position === "odd" && counter % 2 !== 1) {
        return false;
      } else if (segment.position === "even" && counter % 2 !== 0) {
        return false;
      } else if (segment.position === "nth" && counter !== segment.positionValue) {
        return false;
      }
    }
    return true;
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this);
  }
  /**
   * Create a snapshot of current state.
   * @returns {Object}
   */
  snapshot() {
    return {
      path: this.path.map((node) => ({ ...node })),
      siblingStacks: this.siblingStacks.map((level) => level ? { counts: new Map(level.counts), total: level.total } : level),
      keptAttrs: this._keptAttrs.map((entry) => ({ ...entry }))
    };
  }
  /**
   * Restore state from snapshot.
   * @param {Object} snapshot
   */
  restore(snapshot) {
    this._pathStringCache = null;
    this.path = snapshot.path.map((node) => ({ ...node }));
    this.siblingStacks = snapshot.siblingStacks.map((level) => level ? { counts: new Map(level.counts), total: level.total } : level);
    this._keptAttrs = (snapshot.keptAttrs || []).map((entry) => ({ ...entry }));
  }
  /**
   * Return the read-only {@link MatcherView} for this matcher.
   *
   * The same instance is returned on every call — no allocation occurs.
   * It always reflects the current parser state and is safe to pass to
   * user callbacks without risk of accidental mutation.
   *
   * @returns {MatcherView}
   *
   * @example
   * const view = matcher.readOnly();
   * // pass view to callbacks — it stays in sync automatically
   * view.matches(expr);       // ✓
   * view.getCurrentTag();     // ✓
   * // view.push(...)         // ✗ method does not exist — caught by TypeScript
   */
  readOnly() {
    return this._view;
  }
};

// node_modules/is-unsafe/src/contexts/html.js
var HTML_PATTERNS = [
  {
    id: "html-script-open",
    description: "<script opening tag",
    pattern: /<script[\s>/]/i
  },
  {
    id: "html-script-close",
    description: "</script closing tag",
    pattern: /<\/script[\s>]/i
  },
  {
    id: "html-javascript-protocol",
    description: "javascript: URI scheme (with optional whitespace/encoding)",
    // Handles j&#x61;vascript:, j\u0061vascript:, and whitespace variants
    pattern: /j[\t\n\r ]*a[\t\n\r ]*v[\t\n\r ]*a[\t\n\r ]*s[\t\n\r ]*c[\t\n\r ]*r[\t\n\r ]*i[\t\n\r ]*p[\t\n\r ]*t[\t\n\r ]*:/i
  },
  {
    id: "html-vbscript-protocol",
    description: "vbscript: URI scheme",
    pattern: /vbscript[\t\n\r ]*:/i
  },
  {
    id: "html-data-html",
    description: "data:text/html URI \u2014 can execute scripts in browsers",
    pattern: /data[\t\n\r ]*:[\t\n\r ]*text\/html/i
  },
  {
    id: "html-data-xhtml",
    description: "data:application/xhtml+xml URI",
    pattern: /data[\t\n\r ]*:[\t\n\r ]*application\/xhtml/i
  },
  {
    id: "html-data-svg",
    description: "data:image/svg+xml URI \u2014 can execute scripts",
    pattern: /data[\t\n\r ]*:[\t\n\r ]*image\/svg\+xml/i
  },
  {
    id: "html-inline-event-handler",
    description: "Inline event handler attributes: onclick=, onerror=, onload=, etc.",
    // \bon ensures we match a word boundary so "phonetic=" is not caught
    pattern: /\bon\w{1,30}\s*=/i
  },
  {
    id: "html-entity-obfuscated-script",
    description: "HTML-entity-encoded <script (e.g. &#x3C;script or &lt;script)",
    // Entities include optional trailing semicolon: &#x3C; or &#x3C (both valid in HTML5)
    pattern: /(?:&#x0*3[Cc];?|&#0*60;?|&lt;)\s*script/i
  },
  {
    id: "html-entity-obfuscated-javascript",
    description: 'HTML-entity-encoded javascript: (partial \u2014 catches common &#106; or &#x6a; for "j")',
    pattern: /(?:&#x0*6[Aa];?|&#0*106;?)\s*(?:&#x0*61;?|a)[\s\S]{0,80}script\s*:/i
  },
  {
    id: "html-style-expression",
    description: "CSS expression() \u2014 IE-era code execution in style attributes",
    pattern: /style[\s\S]{0,20}expression\s*\(/i
  },
  {
    id: "html-object-embed",
    description: "<object or <embed tags that can load active content",
    pattern: /<(?:object|embed)[\s>/]/i
  },
  {
    id: "html-base-tag",
    description: "<base href= \u2014 can hijack all relative URLs on a page",
    pattern: /<base[\s>]/i
  },
  {
    id: "html-meta-refresh",
    description: '<meta http-equiv="refresh" \u2014 can redirect users',
    pattern: /<meta[\s\S]{0,40}http-equiv[\s\S]{0,20}refresh/i
  },
  {
    id: "html-srcdoc",
    description: "srcdoc= attribute on iframes \u2014 embeds HTML that can run scripts",
    pattern: /srcdoc\s*=/i
  },
  {
    id: "html-iframe",
    description: "<iframe tag",
    pattern: /<iframe[\s>/]/i
  },
  {
    id: "html-form",
    description: "<form tag \u2014 can be used for phishing / credential harvesting injection",
    pattern: /<form[\s>/]/i
  }
];
var html_default = HTML_PATTERNS;

// node_modules/is-unsafe/src/contexts/xml.js
var XML_PATTERNS = [
  {
    id: "xml-cdata-injection",
    description: "CDATA section injection: <![CDATA[ breaks out of text node context",
    pattern: /<!\[CDATA\[/i
  },
  {
    id: "xml-cdata-close",
    description: "CDATA close sequence: ]]> can terminate an enclosing CDATA section",
    pattern: /\]\]>/
  },
  {
    id: "xml-processing-instruction",
    description: "XML processing instruction: <?xml-stylesheet or <?php etc.",
    pattern: /<\?(?:xml[\- ]|php|asp)/i
  },
  {
    id: "xml-doctype-injection",
    description: "DOCTYPE declaration embedded in content \u2014 can define entities",
    // Match <!DOCTYPE followed by end-of-string, whitespace, or [ (internal subset)
    pattern: /<!DOCTYPE(?:[\s[]|$)/i
  },
  {
    id: "xml-entity-system",
    description: "SYSTEM keyword \u2014 used in external entity declarations (XXE)",
    pattern: /\bSYSTEM\s+["']/i
  },
  {
    id: "xml-entity-public",
    description: "PUBLIC keyword \u2014 used in external entity declarations (XXE)",
    pattern: /\bPUBLIC\s+["']/i
  },
  {
    id: "xml-entity-declaration",
    description: "<!ENTITY declaration \u2014 defines entities, potential XXE or entity expansion",
    pattern: /<!ENTITY[\s%]/i
  },
  {
    id: "xml-billion-laughs",
    description: "Entity reference chaining / billion laughs: repeated &eX; style references",
    // Heuristic: 3+ consecutive entity refs suggests expansion attack
    pattern: /(?:&\w{1,20};){3,}/
  },
  {
    id: "xml-namespace-confusion",
    description: "xmlns: attribute injection \u2014 can redefine namespaces to confuse parsers",
    // pattern: /\bxmlns\s*(?::\w{1,40})?\s*=/i,
    pattern: /\bxmlns(?::\w{1,40})?\s*=/i
  },
  {
    id: "xml-comment-injection",
    description: "<!-- comment injection \u2014 can hide content from some parsers",
    pattern: /<!--/
  },
  {
    id: "xml-comment-close",
    description: "--> closes an enclosing XML comment",
    pattern: /-->/
  },
  {
    id: "xml-pi-close",
    description: "?> closes an enclosing processing instruction",
    pattern: /\?>/
  }
];
var xml_default = XML_PATTERNS;

// node_modules/is-unsafe/src/contexts/svg.js
var SVG_PATTERNS = [
  {
    id: "svg-script-element",
    description: "<script element inside SVG executes JavaScript",
    pattern: /<script[\s>/]/i
  },
  {
    id: "svg-xlink-href-javascript",
    description: "xlink:href with javascript: \u2014 classic SVG XSS via <a> or <use>",
    pattern: /xlink\s*:\s*href\s*=\s*["']?\s*javascript\s*:/i
  },
  {
    id: "svg-href-javascript",
    description: "href= with javascript: in SVG context (<a>, <animate>, etc.)",
    pattern: /href\s*=\s*["']?\s*javascript\s*:/i
  },
  {
    id: "svg-foreignobject",
    description: "<foreignObject embeds HTML inside SVG \u2014 can execute scripts",
    pattern: /<foreignObject[\s>/]/i
  },
  {
    id: "svg-use-external",
    description: "<use xlink:href or href pointing to external resource (non-fragment URL)",
    // Match <use with href= where the value starts with a non-# character (external URL)
    // [\"'][^#] catches quoted values not starting with #; [^\"'#\s>] catches unquoted
    pattern: /<use[\s\S]{0,60}(?:xlink\s*:\s*)?href\s*=\s*(?:["'][^#]|[^"'#\s>])/i
  },
  {
    id: "svg-animate-href",
    description: '<animate attributeName="href" \u2014 can dynamically change href to javascript:',
    pattern: /<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*href["']/i
  },
  {
    id: "svg-animate-xlinkhref",
    description: '<animate attributeName="xlink:href"',
    pattern: /<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*xlink\s*:\s*href["']/i
  },
  {
    id: "svg-set-javascript",
    description: '<set to="javascript:..." \u2014 sets an attribute to a javascript: URI',
    pattern: /<set[\s\S]{0,80}to\s*=\s*["']?\s*javascript\s*:/i
  },
  {
    id: "svg-event-handler",
    description: "SVG-specific event handler attributes: onload=, onerror=, onactivate=, etc.",
    pattern: /\bon(?:load|error|activate|begin|end|repeat|focus|blur|click|mouse\w{1,20}|key\w{1,20})\s*=/i
  },
  {
    id: "svg-handler-generic",
    description: "Generic on* handler catch-all for SVG attributes",
    pattern: /\bon\w{1,30}\s*=/i
  },
  {
    id: "svg-filter-feimage",
    description: "<feImage href= \u2014 filter primitive that can load external resources",
    pattern: /<feImage[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=/i
  },
  {
    id: "svg-image-external",
    description: "<image xlink:href with http/https or javascript protocol",
    pattern: /<image[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=\s*["']?\s*(?:https?|javascript)\s*:/i
  },
  {
    id: "svg-style-javascript",
    description: "style= attribute containing javascript: (e.g. background:url(javascript:...))",
    pattern: /style\s*=[\s\S]{0,60}javascript\s*:/i
  }
];
var svg_default = SVG_PATTERNS;

// node_modules/is-unsafe/src/contexts/sql.js
var SQL_PATTERNS = [
  {
    id: "sql-block-comment-open",
    description: "SQL block comment open: /* ... */ \u2014 unusual in legitimate user text",
    pattern: /\/\*/
  },
  {
    id: "sql-union-select",
    description: "UNION SELECT \u2014 most common SQL injection aggregation attack",
    pattern: /\bUNION\s{1,20}(?:ALL\s{1,20})?SELECT\b/i
  },
  {
    id: "sql-drop-table",
    description: "DROP TABLE \u2014 destructive DDL injection",
    pattern: /\bDROP\s{1,20}TABLE\b/i
  },
  {
    id: "sql-drop-database",
    description: "DROP DATABASE \u2014 destructive DDL injection",
    pattern: /\bDROP\s{1,20}DATABASE\b/i
  },
  {
    id: "sql-insert-into",
    description: "INSERT INTO \u2014 data injection",
    pattern: /\bINSERT\s{1,20}INTO\b/i
  },
  {
    id: "sql-delete-from",
    description: "DELETE FROM \u2014 data deletion injection",
    pattern: /\bDELETE\s{1,20}FROM\b/i
  },
  {
    id: "sql-update-set",
    description: "UPDATE ... SET \u2014 data modification injection",
    // Allows arbitrary content between UPDATE and SET (table name, alias, etc.)
    pattern: /\bUPDATE\b[\s\S]{1,60}\bSET\b/i
  },
  {
    id: "sql-exec-xp",
    description: "EXEC xp_ \u2014 MSSQL extended stored procedure execution",
    pattern: /\bEXEC(?:UTE)?\s{1,20}xp_/i
  },
  {
    id: "sql-tautology-string",
    description: `Classic string tautology: ' OR '1'='1 or " OR "1"="1"`,
    // Last quote is optional — injection may truncate it: ' OR '1'='1--
    pattern: /'\s{0,10}OR\s{0,10}'[^']{0,20}'\s*=\s*'[^']{0,20}/i
  },
  {
    id: "sql-tautology-numeric",
    description: "Numeric tautology: OR 1=1",
    pattern: /\bOR\s{1,10}1\s*=\s*1\b/i
  },
  {
    id: "sql-always-true-zero",
    description: "Numeric tautology: OR 0=0",
    pattern: /\bOR\s{1,10}0\s*=\s*0\b/i
  },
  {
    id: "sql-sleep-benchmark",
    description: "Time-based blind injection: SLEEP() or BENCHMARK()",
    pattern: /\b(?:SLEEP|BENCHMARK)\s*\(/i
  },
  {
    id: "sql-waitfor-delay",
    description: "MSSQL time-based blind injection: WAITFOR DELAY",
    pattern: /\bWAITFOR\s{1,20}DELAY\b/i
  },
  {
    id: "sql-char-function",
    description: "CHAR() function \u2014 used to obfuscate injected strings",
    pattern: /\bCHAR\s*\(\s*\d{1,3}/i
  },
  {
    id: "sql-information-schema",
    description: "INFORMATION_SCHEMA \u2014 reconnaissance query for table/column enumeration",
    pattern: /\bINFORMATION_SCHEMA\b/i
  }
];
var sql_default = SQL_PATTERNS;

// node_modules/is-unsafe/src/contexts/shell.js
var SHELL_PATTERNS = [
  {
    id: "shell-path-traversal-unix",
    description: "Unix path traversal: ../  \u2014 climbing the directory tree",
    pattern: /\.\.\//
  },
  {
    id: "shell-path-traversal-windows",
    description: "Windows path traversal: ..\\ \u2014 climbing the directory tree",
    pattern: /\.\.\\/
  },
  {
    id: "shell-path-traversal-encoded",
    description: "URL-encoded path traversal: %2e%2e or %2f variants",
    pattern: /%2e%2e|%2f\.\.|\.\.%2f/i
  },
  {
    id: "shell-null-byte",
    description: "Null byte injection: \\x00 or %00 \u2014 truncates strings in C-backed functions",
    pattern: /\x00|%00/
  },
  {
    id: "shell-semicolon",
    description: "Semicolon command separator: cmd1; cmd2",
    pattern: /;/
  },
  {
    id: "shell-pipe",
    description: "Pipe operator: cmd1 | cmd2",
    pattern: /\|/
  },
  {
    id: "shell-and-operator",
    description: "AND operator: cmd1 && cmd2",
    pattern: /&&/
  },
  {
    id: "shell-or-operator",
    description: "OR operator: cmd1 || cmd2",
    pattern: /\|\|/
  },
  {
    id: "shell-backtick",
    description: "Backtick command substitution: `cmd`",
    pattern: /`/
  },
  {
    id: "shell-dollar-paren",
    description: "Dollar-paren command substitution: $(cmd)",
    pattern: /\$\(/
  },
  {
    id: "shell-dollar-brace",
    description: "Dollar-brace variable expansion: ${var} \u2014 can be abused for injection",
    pattern: /\$\{/
  },
  {
    id: "shell-redirect-out",
    description: "Output redirection: cmd > file or cmd >> file",
    pattern: />{1,2}/
  },
  {
    id: "shell-redirect-in",
    description: "Input redirection: cmd < file",
    pattern: /</
  },
  {
    id: "shell-newline-injection",
    description: "Newline injection: \\n or \\r \u2014 can inject new shell commands",
    pattern: /[\n\r]/
  },
  {
    id: "shell-glob-star",
    description: "Glob expansion: * or ? \u2014 can expand to unintended files",
    // Only flag when combined with path separators to reduce false positives
    pattern: /[/\\][*?]/
  },
  {
    id: "shell-absolute-root",
    description: "Absolute root path injection: string starting with / or \\ (Windows UNC)",
    pattern: /^(?:\/|\\\\)/
  },
  {
    id: "shell-windows-drive",
    description: "Windows drive letter path injection: C:\\ or D:/",
    pattern: /^[a-zA-Z]:[/\\]/
  },
  {
    id: "shell-curl-wget",
    description: "curl/wget with URL or flags \u2014 can exfiltrate data or download payloads",
    // Require a URL scheme (http/https/ftp) or a flag (-) to reduce false positives
    // "curl is a tool" won't match; "curl http://..." or "curl -s ..." will
    pattern: /\b(?:curl|wget)\s+(?:https?:\/\/|ftp:\/\/|-)/i
  }
];
var shell_default = SHELL_PATTERNS;

// node_modules/is-unsafe/src/contexts/redos.js
var REDOS_PATTERNS = [
  {
    id: "redos-nested-quantifier-plus",
    description: "Nested + quantifier inside a group with outer quantifier: (a+)+, (.+b)*, etc.",
    // Matches any group containing a + quantifier, with an outer * or + — catches (a+)+, (.+b)*, etc.
    pattern: /\([^)]*\+[^)]*\)[+*]/
  },
  {
    id: "redos-nested-quantifier-star",
    description: "Nested * quantifier: (a*)* or (a*)+ \u2014 catastrophic backtracking",
    pattern: /\([^)]*\*[^)]*\)[*+]/
  },
  {
    id: "redos-nested-groups",
    description: "Doubly nested quantified groups: ((a+)+) \u2014 guaranteed catastrophic",
    pattern: /\(\([^)]{0,40}\)[+*]\)[+*]/
  },
  {
    id: "redos-alternation-overlap",
    description: "Overlapping alternation under quantifier: (a|a)+ \u2014 ambiguous NFA paths",
    // Detect repeated identical alternatives under a quantifier
    pattern: /\(([^|()]{1,20})\|(?:\1)(?:\|[^|()]{1,20}){0,5}\)[+*?]{1,2}/
  },
  {
    id: "redos-star-plus-concat",
    description: "(x*x)+ pattern \u2014 triggers super-linear backtracking",
    pattern: /\([^)]{0,10}\*[^)]{0,10}\)[+*]/
  },
  {
    id: "redos-dot-star-greedy",
    description: "(.*){n,} or (.+){n,} \u2014 repeated greedy dot quantifiers",
    pattern: /\(\.[*+]\)\{?\d/
  },
  {
    id: "redos-large-repetition",
    description: "Very large fixed or range repetition count {1000,} or {1000,n} \u2014 denial of service via backtracking",
    // Matches { followed by 4+ digits (≥1000), then optional ,digits }
    pattern: /\{\d{4,}(?:,\d*)?\}/
  },
  {
    id: "redos-catastrophic-alternation",
    description: "Long alternation with many similar branches \u2014 polynomial backtracking risk",
    // Heuristic: 10+ pipe-separated alternatives in a single group
    pattern: /\([^)]{0,200}(?:\|[^|)]{0,50}){9,}\)/
  }
];
var redos_default = REDOS_PATTERNS;

// node_modules/is-unsafe/src/contexts/nosql.js
var sep5 = `["'\\s]*:`;
var NOSQL_PATTERNS = [
  // ─── MongoDB $ operator injection ────────────────────────────────────────
  {
    id: "nosql-where-operator",
    description: "$where \u2014 executes arbitrary JavaScript server-side in MongoDB",
    pattern: new RegExp(`\\$where${sep5}`, "i")
  },
  {
    id: "nosql-ne-operator",
    description: '$ne \u2014 "not equal" operator used to bypass equality checks',
    pattern: new RegExp(`\\$ne${sep5}`, "i")
  },
  {
    id: "nosql-gt-operator",
    description: '$gt \u2014 "greater than" used to bypass password/value checks',
    pattern: new RegExp(`\\$gte?${sep5}`, "i")
  },
  {
    id: "nosql-lt-operator",
    description: '$lt / $lte \u2014 "less than" bypass variants',
    pattern: new RegExp(`\\$lte?${sep5}`, "i")
  },
  {
    id: "nosql-regex-operator",
    description: "$regex \u2014 can be used to extract data character by character (blind injection)",
    pattern: new RegExp(`\\$regex${sep5}`, "i")
  },
  {
    id: "nosql-or-operator",
    description: "$or \u2014 logical OR; used to create always-true conditions",
    pattern: new RegExp(`\\$or${sep5}\\s*\\[`, "i")
  },
  {
    id: "nosql-and-operator",
    description: "$and \u2014 logical AND operator injection",
    pattern: new RegExp(`\\$and${sep5}\\s*\\[`, "i")
  },
  {
    id: "nosql-nor-operator",
    description: "$nor \u2014 logical NOR operator injection",
    pattern: new RegExp(`\\$nor${sep5}\\s*\\[`, "i")
  },
  {
    id: "nosql-exists-operator",
    description: "$exists \u2014 can enumerate fields to determine schema",
    pattern: new RegExp(`\\$exists${sep5}`, "i")
  },
  {
    id: "nosql-in-operator",
    description: "$in \u2014 matches any value in a list; can enumerate values",
    pattern: new RegExp(`\\$in${sep5}\\s*\\[`, "i")
  },
  {
    id: "nosql-expr-operator",
    description: "$expr \u2014 allows aggregation expressions in queries (MongoDB 3.6+)",
    pattern: new RegExp(`\\$expr${sep5}`, "i")
  },
  {
    id: "nosql-function-operator",
    description: "$function \u2014 executes arbitrary JavaScript in MongoDB 4.4+",
    pattern: new RegExp(`\\$function${sep5}`, "i")
  },
  {
    id: "nosql-accumulator-operator",
    description: "$accumulator \u2014 custom aggregation with arbitrary JS execution",
    pattern: new RegExp(`\\$accumulator${sep5}`, "i")
  },
  // ─── Prototype pollution ─────────────────────────────────────────────────
  {
    id: "nosql-proto-pollution",
    description: "__proto__ \u2014 prototype pollution via object key injection",
    pattern: /__proto__/
  },
  {
    id: "nosql-constructor-prototype",
    description: "constructor.prototype \u2014 alternative prototype pollution vector (dot notation or JSON key)",
    // Matches dot-notation (obj.constructor.prototype) and JSON key adjacency
    // ("constructor": {"prototype": ...})
    pattern: /constructor[\s"':.,{\[]*prototype/i
  },
  {
    id: "nosql-proto-bracket",
    description: '["__proto__"] \u2014 bracket-notation prototype pollution',
    pattern: /\[["']__proto__["']\]/
  }
];
var nosql_default = NOSQL_PATTERNS;

// node_modules/is-unsafe/src/contexts/log.js
var LOG_PATTERNS = [
  // ─── CRLF / newline injection ─────────────────────────────────────────────
  {
    id: "log-crlf-injection",
    description: "CRLF injection: literal \\r or \\n embeds fake log lines",
    pattern: /[\r\n]/
  },
  {
    id: "log-url-encoded-crlf",
    description: "URL-encoded CRLF: %0d, %0a, %0D, %0A \u2014 decoded by some log parsers",
    pattern: /%0[dDaA]/
  },
  {
    id: "log-unicode-newline",
    description: "Unicode newline variants: U+2028 (line separator), U+2029 (paragraph separator)",
    pattern: /[\u2028\u2029]/
  },
  // ─── Log4Shell / JNDI injection (CVE-2021-44228) ─────────────────────────
  {
    id: "log-log4shell-jndi",
    description: "Log4Shell: ${jndi:...} triggers remote code execution in Apache Log4j",
    pattern: /\$\{jndi\s*:/i
  },
  {
    id: "log-log4shell-obfuscated",
    description: "Obfuscated Log4Shell: ${::-j}... lookup-bypass prefix used to evade WAF detection",
    // ${::- is the Log4j lookup-bypass escape sequence; presence alone is suspicious
    pattern: /\$\{::-/
  },
  {
    id: "log-log4j-lookup",
    description: "Log4j lookup syntax: ${env:...}, ${sys:...}, ${ctx:...} \u2014 data exfiltration",
    pattern: /\$\{(?:env|sys|ctx|main|map|sd|web|docker|k8s|spring)\s*:/i
  },
  // ─── Server-Side Template Injection (SSTI) in log messages ───────────────
  {
    id: "log-ssti-double-brace",
    description: "SSTI double-brace: {{expression}} \u2014 Jinja2, Twig, Handlebars, etc.",
    pattern: /\{\{[\s\S]{0,80}\}\}/
  },
  {
    id: "log-ssti-hash-brace",
    description: "SSTI hash-brace: #{expression} \u2014 Thymeleaf, Velocity, Ruby ERB",
    pattern: /#\{[\s\S]{0,80}\}/
  },
  {
    id: "log-ssti-dollar-brace",
    description: "SSTI/EL injection: ${expression with operators or method calls} \u2014 JSP EL, Freemarker, SpEL",
    // Require that the ${...} content looks like an expression, not a plain variable name.
    // Flags if the content contains: . ( * + operators, or known SSTI keywords.
    // This avoids flagging ${PATH}, ${HOME} etc. (plain shell variables).
    pattern: /\$\{[^}]*(?:\.|\(|\*|\+|\bclass\b|\bruntime\b|\bprocess\b|\bexec\b)[^}]{0,80}\}/i
  },
  {
    id: "log-ssti-percent-tag",
    description: "SSTI ERB/ASP tag: <%= expression %> \u2014 Ruby ERB, ASP",
    pattern: /<%=[\s\S]{0,80}%>/
  },
  // ─── Null byte ────────────────────────────────────────────────────────────
  {
    id: "log-null-byte",
    description: "Null byte: \\x00 or %00 \u2014 can truncate log entries in C-backed loggers",
    pattern: /\x00|%00/
  },
  // ─── ANSI escape injection ────────────────────────────────────────────────
  {
    id: "log-ansi-escape",
    description: "ANSI escape sequence: ESC[ \u2014 can manipulate terminal output when logs are tailed",
    pattern: /\x1b\[/
  }
];
var log_default = LOG_PATTERNS;

// node_modules/is-unsafe/src/contexts/sql-strict.js
var SQL_STRICT_EXTRA = [
  {
    id: "sql-line-comment",
    description: "SQL line comment: -- followed by whitespace or end of string",
    pattern: /--(?:\s|$)/
  },
  {
    id: "sql-stacked-query",
    description: "Stacked queries: semicolon immediately followed by a SQL keyword",
    pattern: /;\s{0,10}(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/i
  },
  {
    id: "sql-hex-encoding",
    description: "Hex-encoded string injection: 0x41414141 style (MySQL)",
    pattern: /\b0x[0-9a-f]{4,}/i
  }
];
var SQL_STRICT_PATTERNS = [...sql_default, ...SQL_STRICT_EXTRA];
var sql_strict_default = SQL_STRICT_PATTERNS;

// node_modules/is-unsafe/src/index.js
html_default.label = "HTML";
xml_default.label = "XML";
svg_default.label = "SVG";
sql_default.label = "SQL";
sql_strict_default.label = "SQL-STRICT";
shell_default.label = "SHELL";
redos_default.label = "REDOS";
nosql_default.label = "NOSQL";
log_default.label = "LOG";
var VALID_CONTEXTS = Object.freeze({
  HTML: html_default,
  XML: xml_default,
  SVG: svg_default,
  SQL: sql_default,
  "SQL-STRICT": sql_strict_default,
  SHELL: shell_default,
  REDOS: redos_default,
  NOSQL: nosql_default,
  LOG: log_default
});
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(
      `is-unsafe: first argument must be a string, got ${typeof value}`
    );
  }
}
function assertContext(context) {
  if (context instanceof RegExp) return;
  if (Array.isArray(context)) {
    if (context.length === 0) {
      throw new TypeError("is-unsafe: context must not be an empty array");
    }
    if (Array.isArray(context[0])) {
      for (const list2 of context) {
        if (!Array.isArray(list2) || list2.length === 0) {
          throw new TypeError(
            "is-unsafe: each context in the array must be a non-empty pattern array (PatternList)"
          );
        }
      }
    }
    return;
  }
  throw new TypeError(
    `is-unsafe: second argument must be a PatternList (e.g. HTML), an array of PatternLists (e.g. [HTML, XML]), or a RegExp. Got: ${typeof context}`
  );
}
function normalise(context) {
  if (context instanceof RegExp) return { lists: null, regex: context };
  if (Array.isArray(context[0])) return { lists: context, regex: null };
  return { lists: [context], regex: null };
}
function matchList(value, list2) {
  const label = list2.label ?? "CUSTOM";
  for (const rule of list2) {
    if (rule.pattern.test(value)) {
      return { context: label, id: rule.id, description: rule.description, pattern: rule.pattern };
    }
  }
  return null;
}
function isUnsafe(value, context) {
  assertString(value);
  assertContext(context);
  const { lists, regex } = normalise(context);
  if (regex) return regex.test(value);
  for (const list2 of lists) {
    if (matchList(value, list2) !== null) return true;
  }
  return false;
}

// node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
function extractRawAttributes(prefixedAttrs, options) {
  if (!prefixedAttrs) return {};
  const attrs = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
  if (!attrs) return {};
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(options.attributeNamePrefix)) {
      const rawName = key.substring(options.attributeNamePrefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function extractNamespace(rawTagName) {
  if (!rawTagName || typeof rawTagName !== "string") return void 0;
  const colonIndex = rawTagName.indexOf(":");
  if (colonIndex !== -1 && colonIndex > 0) {
    const ns = rawTagName.substring(0, colonIndex);
    if (ns !== "xmlns") {
      return ns;
    }
  }
  return void 0;
}
var OrderedObjParser = class {
  constructor(options, externalEntities) {
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    this.entityExpansionCount = 0;
    this.currentExpandedLength = 0;
    this.doctypefound = false;
    let namedEntities = { ...XML };
    if (this.options.entityDecoder) {
      this.entityDecoder = this.options.entityDecoder;
    } else {
      if (typeof this.options.htmlEntities === "object") namedEntities = this.options.htmlEntities;
      else if (this.options.htmlEntities === true) namedEntities = { ...COMMON_HTML, ...CURRENCY };
      this.entityDecoder = new EntityDecoder({
        namedEntities: { ...namedEntities, ...externalEntities },
        numericAllowed: this.options.htmlEntities,
        limit: {
          maxTotalExpansions: this.options.processEntities.maxTotalExpansions,
          maxExpandedLength: this.options.processEntities.maxExpandedLength,
          applyLimitsTo: this.options.processEntities.appliesTo
        },
        // onExternalEntity: (name, value) => isUnsafe(value) ? 'block' : 'allow',
        onInputEntity: (name, value) => (
          //TODO: VALID_CONTEXTS.HTML should be set only if this.options.htmlEntities
          isUnsafe(value, [html_default, xml_default]) ? ENTITY_ACTION.BLOCK : ENTITY_ACTION.ALLOW
        )
        //postCheck: resolved => resolved
      });
    }
    this.matcher = new Matcher();
    this.readonlyMatcher = this.matcher.readOnly();
    this.isCurrentNodeStopNode = false;
    this.stopNodeExpressionsSet = new ExpressionSet();
    const stopNodesOpts = this.options.stopNodes;
    if (stopNodesOpts && stopNodesOpts.length > 0) {
      for (let i = 0; i < stopNodesOpts.length; i++) {
        const stopNodeExp = stopNodesOpts[i];
        if (typeof stopNodeExp === "string") {
          this.stopNodeExpressionsSet.add(new Expression(stopNodeExp));
        } else if (stopNodeExp instanceof Expression) {
          this.stopNodeExpressionsSet.add(stopNodeExp);
        }
      }
      this.stopNodeExpressionsSet.seal();
    }
  }
};
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  const options = this.options;
  if (val !== void 0) {
    if (options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if (val.length > 0) {
      if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
      const jPathOrMatcher = options.jPath ? jPath.toString() : jPath;
      const newval = options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
      if (newval === null || newval === void 0) {
        return val;
      } else if (typeof newval !== typeof val || newval !== val) {
        return newval;
      } else if (options.trimValues) {
        return parseValue(val, options.parseTagValue, options.numberParseOptions);
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal === val) {
          return parseValue(val, options.parseTagValue, options.numberParseOptions);
        } else {
          return val;
        }
      }
    }
  }
}
function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(":");
    const prefix = tagname.charAt(0) === "/" ? "/" : "";
    if (tags[0] === "xmlns") {
      return "";
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}
var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
function buildAttributesMap(attrStr, jPath, tagName, force = false) {
  const options = this.options;
  if (force === true || options.ignoreAttributes !== true && typeof attrStr === "string") {
    const matches = getAllMatches(attrStr, attrsRegx);
    const len = matches.length;
    const attrs = {};
    const processedVals = new Array(len);
    let hasRawAttrs = false;
    const rawAttrsForMatcher = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      const oldVal = matches[i][4];
      if (attrName.length && oldVal !== void 0) {
        let val = oldVal;
        if (options.trimValues) val = val.trim();
        val = this.replaceEntitiesValue(val, tagName, this.readonlyMatcher);
        processedVals[i] = val;
        rawAttrsForMatcher[attrName] = val;
        hasRawAttrs = true;
      }
    }
    if (hasRawAttrs && typeof jPath === "object" && jPath.updateCurrent) {
      jPath.updateCurrent(rawAttrsForMatcher);
    }
    const jPathStr = options.jPath ? jPath.toString() : this.readonlyMatcher;
    let hasAttrs = false;
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      if (this.ignoreAttributesFn(attrName, jPathStr)) continue;
      let aName = options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (options.transformAttributeName) {
          aName = options.transformAttributeName(aName);
        }
        aName = sanitizeName(aName, options);
        if (matches[i][4] !== void 0) {
          const oldVal = processedVals[i];
          const newVal = options.attributeValueProcessor(attrName, oldVal, jPathStr);
          if (newVal === null || newVal === void 0) {
            attrs[aName] = oldVal;
          } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
            attrs[aName] = newVal;
          } else {
            attrs[aName] = parseValue(oldVal, options.parseAttributeValue, options.numberParseOptions);
          }
          hasAttrs = true;
        } else if (options.allowBooleanAttributes) {
          attrs[aName] = true;
          hasAttrs = true;
        }
      }
    }
    if (!hasAttrs) return;
    if (options.attributesGroupName && !options.preserveOrder) {
      const attrCollection = {};
      attrCollection[options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs;
  }
}
var parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n");
  const xmlObj = new XmlNode("!xml");
  let currentNode = xmlObj;
  let textData = "";
  this.matcher.reset();
  this.entityDecoder.reset();
  this.entityExpansionCount = 0;
  this.currentExpandedLength = 0;
  this.doctypefound = false;
  const options = this.options;
  const docTypeReader = new DocTypeReader(options.processEntities);
  const xmlLen = xmlData.length;
  for (let i = 0; i < xmlLen; i++) {
    const ch = xmlData[i];
    if (ch === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i + 2, closeIndex).trim();
        if (options.removeNSPrefix) {
          const colonIndex = tagName.indexOf(":");
          if (colonIndex !== -1) {
            tagName = tagName.substr(colonIndex + 1);
          }
        }
        tagName = transformTagName(options.transformTagName, tagName, "", options).tagName;
        if (currentNode) {
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        }
        const lastTagName = this.matcher.getCurrentTag();
        if (tagName && options.unpairedTagsSet.has(tagName)) {
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        if (lastTagName && options.unpairedTagsSet.has(lastTagName)) {
          this.matcher.pop();
          this.tagsNodeStack.pop();
        }
        this.matcher.pop();
        this.isCurrentNodeStopNode = false;
        currentNode = this.tagsNodeStack.pop() || xmlObj;
        if (options.captureMetaData && currentNode) {
          currentNode.addEndIndex(closeIndex + 1);
        }
        textData = "";
        i = closeIndex;
      } else if (c1 === 63) {
        let tagData = readTagExp(xmlData, i, false, "?>");
        if (!tagData) throw new Error("Pi Tag is not closed.");
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        const attsMap = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName, true);
        if (attsMap) {
          const ver = attsMap[this.options.attributeNamePrefix + "version"];
          this.entityDecoder.setXmlVersion(Number(ver) || 1);
          docTypeReader.setXmlVersion(Number(ver) || 1);
        }
        if (options.ignoreDeclaration && tagData.tagName === "?xml" || options.ignorePiTags) {
        } else {
          const childNode = new XmlNode(tagData.tagName);
          childNode.add(options.textNodeName, "");
          if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent && options.ignoreAttributes !== true) {
            childNode[":@"] = attsMap;
          }
          this.addChild(currentNode, childNode, this.readonlyMatcher, i);
          if (options.captureMetaData) {
            currentNode.addEndIndex(tagData.closeIndex + 2);
          }
        }
        i = tagData.closeIndex + 1;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
        if (options.commentPropName) {
          const comment = xmlData.substring(i + 4, endIndex - 2);
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
          currentNode.add(options.commentPropName, [{ [options.textNodeName]: comment }]);
        }
        i = endIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 68) {
        if (this.doctypefound) throw new Error("Multiple DOCTYPE declarations found.");
        this.doctypefound = true;
        const result = docTypeReader.readDocType(xmlData, i);
        this.entityDecoder.addInputEntities(result.entities);
        i = result.i;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9, closeIndex);
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        let val = this.parseTextData(tagExp, currentNode.tagname, this.readonlyMatcher, true, false, true, true);
        if (val == void 0) val = "";
        if (options.cdataPropName) {
          currentNode.add(options.cdataPropName, [{ [options.textNodeName]: tagExp }]);
        } else {
          currentNode.add(options.textNodeName, val);
        }
        i = closeIndex + 2;
      } else {
        let result = readTagExp(xmlData, i, options.removeNSPrefix);
        if (!result) {
          const context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlLen, i + 50));
          throw new Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
        }
        let tagName = result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;
        ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
        if (options.strictReservedNames && (tagName === options.commentPropName || tagName === options.cdataPropName || tagName === options.textNodeName || tagName === options.attributesGroupName)) {
          throw new Error(`Invalid tag name: ${tagName}`);
        }
        if (currentNode && textData) {
          if (currentNode.tagname !== "!xml") {
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
          }
        }
        const lastTag = currentNode;
        if (lastTag && options.unpairedTagsSet.has(lastTag.tagname)) {
          currentNode = this.tagsNodeStack.pop();
          this.matcher.pop();
        }
        let isSelfClosing = false;
        if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
          isSelfClosing = true;
          if (tagName[tagName.length - 1] === "/") {
            tagName = tagName.substr(0, tagName.length - 1);
            tagExp = tagName;
          } else {
            tagExp = tagExp.substr(0, tagExp.length - 1);
          }
          attrExpPresent = tagName !== tagExp;
        }
        let prefixedAttrs = null;
        let rawAttrs = {};
        let namespace = void 0;
        namespace = extractNamespace(rawTagName);
        if (tagName !== xmlObj.tagname) {
          this.matcher.push(tagName, {}, namespace);
        }
        if (tagName !== tagExp && attrExpPresent) {
          prefixedAttrs = this.buildAttributesMap(tagExp, this.matcher, tagName);
          if (prefixedAttrs) {
            rawAttrs = extractRawAttributes(prefixedAttrs, options);
          }
        }
        if (tagName !== xmlObj.tagname) {
          this.isCurrentNodeStopNode = this.isItStopNode();
        }
        const startIndex = i;
        if (this.isCurrentNodeStopNode) {
          let tagContent = "";
          if (isSelfClosing) {
            i = result.closeIndex;
          } else if (options.unpairedTagsSet.has(tagName)) {
            i = result.closeIndex;
          } else {
            const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result2.i;
            tagContent = result2.tagContent;
          }
          const childNode = new XmlNode(tagName);
          if (prefixedAttrs) {
            childNode[":@"] = prefixedAttrs;
          }
          childNode.add(options.textNodeName, tagContent);
          this.matcher.pop();
          this.isCurrentNodeStopNode = false;
          this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
          if (options.captureMetaData) {
            currentNode.addEndIndex(i + 1);
          }
        } else {
          if (isSelfClosing) {
            ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            if (options.captureMetaData) {
              currentNode.addEndIndex(closeIndex + 1);
            }
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
          } else if (options.unpairedTagsSet.has(tagName)) {
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            if (options.captureMetaData) {
              currentNode.addEndIndex(result.closeIndex + 1);
            }
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
            i = result.closeIndex;
            continue;
          } else {
            const childNode = new XmlNode(tagName);
            if (this.tagsNodeStack.length > options.maxNestedTags) {
              throw new Error("Maximum nested tags exceeded");
            }
            this.tagsNodeStack.push(currentNode);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    } else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};
function addChild(currentNode, childNode, matcher, startIndex) {
  if (!this.options.captureMetaData) startIndex = void 0;
  const jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
  const result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
  if (result === false) {
  } else if (typeof result === "string") {
    childNode.tagname = result;
    currentNode.addChild(childNode, startIndex);
  } else {
    currentNode.addChild(childNode, startIndex);
  }
}
function replaceEntitiesValue(val, tagName, jPath) {
  const entityConfig = this.options.processEntities;
  if (!entityConfig || !entityConfig.enabled) {
    return val;
  }
  if (entityConfig.allowedTags) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    const allowed = Array.isArray(entityConfig.allowedTags) ? entityConfig.allowedTags.includes(tagName) : entityConfig.allowedTags(tagName, jPathOrMatcher);
    if (!allowed) {
      return val;
    }
  }
  if (entityConfig.tagFilter) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) {
      return val;
    }
  }
  return this.entityDecoder.decode(val);
}
function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
  if (textData) {
    if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
    textData = this.parseTextData(
      textData,
      parentNode.tagname,
      matcher,
      false,
      parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false,
      isLeafNode
    );
    if (textData !== void 0 && textData !== "")
      parentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}
function isItStopNode() {
  if (this.stopNodeExpressionsSet.size === 0) return false;
  return this.matcher.matchesAny(this.stopNodeExpressionsSet);
}
function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
  let attrBoundary = 0;
  const len = xmlData.length;
  const closeCode0 = closingChar.charCodeAt(0);
  const closeCode1 = closingChar.length > 1 ? closingChar.charCodeAt(1) : -1;
  let result = "";
  let segmentStart = i;
  for (let index = i; index < len; index++) {
    const code = xmlData.charCodeAt(index);
    if (attrBoundary) {
      if (code === attrBoundary) attrBoundary = 0;
    } else if (code === 34 || code === 39) {
      attrBoundary = code;
    } else if (code === closeCode0) {
      if (closeCode1 !== -1) {
        if (xmlData.charCodeAt(index + 1) === closeCode1) {
          result += xmlData.substring(segmentStart, index);
          return { data: result, index };
        }
      } else {
        result += xmlData.substring(segmentStart, index);
        return { data: result, index };
      }
    } else if (code === 9 && !attrBoundary) {
      result += xmlData.substring(segmentStart, index) + " ";
      segmentStart = index + 1;
    }
  }
}
function findClosingIndex(xmlData, str, i, errMsg) {
  const closingIndex = xmlData.indexOf(str, i);
  if (closingIndex === -1) {
    throw new Error(errMsg);
  } else {
    return closingIndex + str.length - 1;
  }
}
function findClosingChar(xmlData, char, i, errMsg) {
  const closingIndex = xmlData.indexOf(char, i);
  if (closingIndex === -1) throw new Error(errMsg);
  return closingIndex;
}
function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
  const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
  if (!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if (separatorIndex !== -1) {
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }
  const rawTagName = tagName;
  if (removeNSPrefix) {
    const colonIndex = tagName.indexOf(":");
    if (colonIndex !== -1) {
      tagName = tagName.substr(colonIndex + 1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }
  return {
    tagName,
    tagExp,
    closeIndex,
    attrExpPresent,
    rawTagName
  };
}
function readStopNodeData(xmlData, tagName, i) {
  const startIndex = i;
  let openTagCount = 1;
  const xmllen = xmlData.length;
  for (; i < xmllen; i++) {
    if (xmlData[i] === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingChar(xmlData, ">", i, `${tagName} is not closed`);
        let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
        if (closeTagName === tagName) {
          openTagCount--;
          if (openTagCount === 0) {
            return {
              tagContent: xmlData.substring(startIndex, i),
              i: closeIndex
            };
          }
        }
        i = closeIndex;
      } else if (c1 === 63) {
        const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
        i = closeIndex;
      } else {
        const tagData = readTagExp(xmlData, i, false);
        if (tagData) {
          const openTagName = tagData && tagData.tagName;
          if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
            openTagCount++;
          }
          i = tagData.closeIndex;
        }
      }
    }
  }
}
function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === "string") {
    const newval = val.trim();
    if (newval === "true") return true;
    else if (newval === "false") return false;
    else return toNumber(val, options);
  } else {
    if (isExist(val)) {
      return val;
    } else {
      return "";
    }
  }
}
function transformTagName(fn, tagName, tagExp, options) {
  if (fn) {
    const newTagName = fn(tagName);
    if (tagExp === tagName) {
      tagExp = newTagName;
    }
    tagName = newTagName;
  }
  tagName = sanitizeName(tagName, options);
  return { tagName, tagExp };
}
function sanitizeName(name, options) {
  if (criticalProperties.includes(name)) {
    throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
  } else if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return options.onDangerousProperty(name);
  }
  return name;
}

// node_modules/fast-xml-parser/src/xmlparser/node2json.js
var METADATA_SYMBOL2 = XmlNode.getMetaDataSymbol();
function stripAttributePrefix(attrs, prefix) {
  if (!attrs || typeof attrs !== "object") return {};
  if (!prefix) return attrs;
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(prefix)) {
      const rawName = key.substring(prefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function prettify(node, options, matcher, readonlyMatcher) {
  return compress(node, options, matcher, readonlyMatcher);
}
function compress(arr2, options, matcher, readonlyMatcher) {
  let text2;
  const compressedObj = {};
  for (let i = 0; i < arr2.length; i++) {
    const tagObj = arr2[i];
    const property = propName(tagObj);
    if (property !== void 0 && property !== options.textNodeName) {
      const rawAttrs = stripAttributePrefix(
        tagObj[":@"] || {},
        options.attributeNamePrefix
      );
      matcher.push(property, rawAttrs);
    }
    if (property === options.textNodeName) {
      if (text2 === void 0) text2 = tagObj[property];
      else text2 += "" + tagObj[property];
    } else if (property === void 0) {
      continue;
    } else if (tagObj[property]) {
      let val = compress(tagObj[property], options, matcher, readonlyMatcher);
      const isLeaf = isLeafTag(val, options);
      if (Object.keys(val).length === 0 && options.alwaysCreateTextNode) {
        val[options.textNodeName] = "";
      }
      if (tagObj[":@"]) {
        assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
      } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
        val = val[options.textNodeName];
      } else if (Object.keys(val).length === 0) {
        if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }
      if (tagObj[METADATA_SYMBOL2] !== void 0 && typeof val === "object" && val !== null) {
        val[METADATA_SYMBOL2] = tagObj[METADATA_SYMBOL2];
      }
      if (compressedObj[property] !== void 0 && Object.prototype.hasOwnProperty.call(compressedObj, property)) {
        if (!Array.isArray(compressedObj[property])) {
          compressedObj[property] = [compressedObj[property]];
        }
        compressedObj[property].push(val);
      } else {
        const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
        if (options.isArray(property, jPathOrMatcher, isLeaf)) {
          compressedObj[property] = [val];
        } else {
          compressedObj[property] = val;
        }
      }
      if (property !== void 0 && property !== options.textNodeName) {
        matcher.pop();
      }
    }
  }
  if (typeof text2 === "string") {
    if (text2.length > 0) compressedObj[options.textNodeName] = text2;
  } else if (text2 !== void 0) compressedObj[options.textNodeName] = text2;
  return compressedObj;
}
function propName(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== ":@") return key;
  }
}
function assignAttributes(obj, attrMap, readonlyMatcher, options) {
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      const rawAttrName = atrrName.startsWith(options.attributeNamePrefix) ? atrrName.substring(options.attributeNamePrefix.length) : atrrName;
      const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() + "." + rawAttrName : readonlyMatcher;
      if (options.isArray(atrrName, jPathOrMatcher, true, true)) {
        obj[atrrName] = [attrMap[atrrName]];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}
function isLeafTag(obj, options) {
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  if (propCount === 0) {
    return true;
  }
  if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
    return true;
  }
  return false;
}

// node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var XMLParser = class {
  constructor(options) {
    this.externalEntities = {};
    this.options = buildOptions(options);
  }
  /**
   * Parse XML dats to JS object 
   * @param {string|Uint8Array} xmlData 
   * @param {boolean|Object} validationOption 
   */
  parse(xmlData, validationOption) {
    if (typeof xmlData !== "string" && xmlData.toString) {
      if (xmlData instanceof Uint8Array && !(typeof Buffer !== "undefined" && Buffer.isBuffer(xmlData))) {
        xmlData = new TextDecoder("utf-8", { ignoreBOM: true }).decode(xmlData);
      } else {
        xmlData = xmlData.toString();
      }
    } else if (typeof xmlData !== "string") {
      throw new Error("XML data is accepted in String or Bytes[] form.");
    }
    if (validationOption) {
      if (validationOption === true) validationOption = {};
      const result = validate(xmlData, validationOption);
      if (result !== true) {
        throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
      }
    }
    const orderedObjParser = new OrderedObjParser(this.options, this.externalEntities);
    const orderedResult = orderedObjParser.parseXml(xmlData);
    if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
    else return prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
  }
  /**
   * Add Entity which is not by default supported by this library
   * @param {string} key 
   * @param {string} value 
   */
  addEntity(key, value) {
    if (value.indexOf("&") !== -1) {
      throw new Error("Entity value can't have '&'");
    } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
      throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
    } else if (value === "&") {
      throw new Error("An entity with value '&' is not permitted");
    } else {
      this.externalEntities[key] = value;
    }
  }
  /**
   * Returns a Symbol that can be used to access the metadata
   * property on a node.
   * 
   * If Symbol is not available in the environment, an ordinary property is used
   * and the name of the property is here returned.
   * 
   * The XMLMetaData property is only present when `captureMetaData`
   * is true in the options.
   */
  static getMetaDataSymbol() {
    return XmlNode.getMetaDataSymbol();
  }
};

// packages/engine-local/src/results.ts
var parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => ["testsuite", "testcase", "package", "class", "line", "failure", "error"].includes(name)
});
var arr = (value) => Array.isArray(value) ? value : value ? [value] : [];
var attr = (node, name) => typeof node[`@${name}`] === "string" ? node[`@${name}`] : void 0;
var looksLikeFile = (value) => !!value && /[\\/].*\.\w+$|^\S+\.(test|spec)\.\w+$/.test(value);
function textOf(node) {
  if (node === void 0) return void 0;
  if (typeof node === "string") return node;
  return typeof node["#text"] === "string" ? node["#text"] : void 0;
}
function parseJUnit(xml, title) {
  const doc = parser.parse(xml);
  const suites = [];
  const collect = (node) => {
    for (const suite of arr(node?.testsuite)) {
      suites.push(suite);
      collect(suite);
    }
  };
  collect(doc.testsuites);
  collect(doc);
  const cases = [];
  for (const suite of suites) {
    const suiteName = attr(suite, "name") ?? "";
    for (const tc of arr(suite.testcase)) {
      const failure = arr(tc.failure)[0] ?? arr(tc.error)[0];
      const skipped = tc.skipped !== void 0;
      const classname = attr(tc, "classname");
      const file = attr(tc, "file") ?? attr(suite, "file") ?? (looksLikeFile(classname) ? classname : looksLikeFile(suiteName) ? suiteName : void 0);
      const line = Number(attr(tc, "line"));
      const seconds = Number(attr(tc, "time"));
      cases.push({
        suite: suiteName || classname || "",
        name: attr(tc, "name") ?? "(unnamed)",
        outcome: failure !== void 0 ? "failed" : skipped ? "skipped" : "passed",
        durationMs: Number.isFinite(seconds) ? Math.round(seconds * 1e3) : void 0,
        message: failure && typeof failure !== "string" ? attr(failure, "message") : void 0,
        details: textOf(failure),
        file,
        line: Number.isFinite(line) && line > 0 ? line : void 0
      });
    }
  }
  const count = (outcome) => cases.filter((c) => c.outcome === outcome).length;
  return {
    title,
    total: cases.length,
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped"),
    durationMs: cases.reduce((sum, c) => sum + (c.durationMs ?? 0), 0),
    cases
  };
}
function mergeTests(title, parts) {
  const cases = parts.flatMap((p) => p.cases);
  return {
    title,
    total: cases.length,
    passed: parts.reduce((n, p) => n + p.passed, 0),
    failed: parts.reduce((n, p) => n + p.failed, 0),
    skipped: parts.reduce((n, p) => n + p.skipped, 0),
    durationMs: parts.reduce((n, p) => n + p.durationMs, 0),
    cases
  };
}
function parseCobertura(xml) {
  const doc = parser.parse(xml);
  const root = doc.coverage ?? {};
  const files = [];
  let branchesCovered = 0;
  let branchesTotal = 0;
  for (const pkg of arr(root.packages?.package)) {
    for (const cls of arr(pkg.classes?.class)) {
      const lines = arr(cls.lines?.line);
      for (const line of lines) {
        const m = /\((\d+)\/(\d+)\)/.exec(attr(line, "condition-coverage") ?? "");
        if (m) {
          branchesCovered += Number(m[1]);
          branchesTotal += Number(m[2]);
        }
      }
      files.push({
        path: attr(cls, "filename") ?? attr(cls, "name") ?? "",
        linesTotal: lines.length,
        linesCovered: lines.filter((line) => Number(attr(line, "hits")) > 0).length
      });
    }
  }
  const declaredTotal = Number(attr(root, "lines-valid"));
  const declaredCovered = Number(attr(root, "lines-covered"));
  return {
    format: "cobertura",
    linesTotal: Number.isFinite(declaredTotal) ? declaredTotal : files.reduce((n, f) => n + f.linesTotal, 0),
    linesCovered: Number.isFinite(declaredCovered) ? declaredCovered : files.reduce((n, f) => n + f.linesCovered, 0),
    branchesTotal: Number(attr(root, "branches-valid")) || branchesTotal || void 0,
    branchesCovered: attr(root, "branches-covered") !== void 0 ? Number(attr(root, "branches-covered")) : branchesTotal ? branchesCovered : void 0,
    files
  };
}
function parseLcov(text2) {
  const files = [];
  let current;
  let branchesTotal = 0;
  let branchesCovered = 0;
  for (const raw of text2.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) current = { path: line.slice(3), linesTotal: 0, linesCovered: 0 };
    else if (line.startsWith("LF:") && current) current.linesTotal = Number(line.slice(3));
    else if (line.startsWith("LH:") && current) current.linesCovered = Number(line.slice(3));
    else if (line.startsWith("BRF:")) branchesTotal += Number(line.slice(4));
    else if (line.startsWith("BRH:")) branchesCovered += Number(line.slice(4));
    else if (line === "end_of_record" && current) {
      files.push(current);
      current = void 0;
    }
  }
  return {
    format: "lcov",
    linesTotal: files.reduce((n, f) => n + f.linesTotal, 0),
    linesCovered: files.reduce((n, f) => n + f.linesCovered, 0),
    branchesTotal: branchesTotal || void 0,
    branchesCovered: branchesTotal ? branchesCovered : void 0,
    files
  };
}
function parseCoverage(text2) {
  if (/<coverage[\s>]/.test(text2)) return parseCobertura(text2);
  if (/^SF:/m.test(text2) && /^end_of_record/m.test(text2)) return parseLcov(text2);
  return void 0;
}

// packages/engine-local/src/steps/publish.ts
var safe2 = (name) => name.replace(/[^A-Za-z0-9._-]/g, "_");
async function findFiles(ctx, folder, patterns) {
  const include = patterns.filter((p) => !p.startsWith("!")).map((p) => p.replace(/\\/g, "/"));
  const exclude = patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1).replace(/\\/g, "/"));
  const found = [];
  const globs = [];
  for (const pattern of include) {
    if (/[*?[\]{}]/.test(pattern)) globs.push(pattern);
    else if (await ctx.backend.exists(ctx.resolve(pattern, folder))) found.push(ctx.resolve(pattern, folder));
  }
  if (globs.length > 0) {
    const relative7 = globs.map((g) => ctx.backend.p.isAbsolute(g) ? ctx.backend.p.relative(folder, g).replace(/\\/g, "/") : g);
    const matches = (0, import_picomatch3.default)(relative7, { dot: true, ignore: exclude });
    for (const file of await ctx.backend.listFiles(folder)) if (matches(file)) found.push(ctx.backend.p.join(folder, file));
  }
  return [...new Set(found)];
}
async function publishTestResults(ctx) {
  const format2 = (ctx.input("testResultsFormat", "testRunner") ?? "JUnit").toLowerCase();
  if (format2 !== "junit") {
    return { result: "unsupported", message: `Test result format '${format2}' is not read locally yet; only JUnit is.` };
  }
  const folder = ctx.resolve(ctx.input("searchFolder") ?? ctx.backend.paths.sources);
  const patterns = (ctx.input("testResultsFiles") ?? "**/TEST-*.xml").split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const title = ctx.input("testRunTitle") ?? ctx.job.displayName;
  const files = await ctx.backend.isDirectory(folder) ? await findFiles(ctx, folder, patterns) : [];
  if (files.length === 0) {
    ctx.warn(`No test result files matching '${patterns.join(", ")}' were found in ${folder}.`);
    return { result: "succeeded" };
  }
  const parts = [];
  const keepDir = path16.join(ctx.io.runDir, "tests", safe2(ctx.job.id));
  fs12.mkdirSync(keepDir, { recursive: true });
  for (const [i, file] of files.entries()) {
    const content = await ctx.backend.readFile(file);
    if (!content) continue;
    fs12.writeFileSync(path16.join(keepDir, `${i}-${safe2(ctx.backend.p.basename(file))}`), content);
    try {
      parts.push(parseJUnit(content.toString("utf8"), title));
    } catch (err) {
      ctx.warn(`Could not read ${file} as JUnit XML: ${err.message}`);
    }
  }
  const summary = mergeTests(title, parts);
  ctx.log(`Result files: ${files.length}. Tests: ${summary.total} total, ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped.`);
  for (const failed of summary.cases.filter((c) => c.outcome === "failed")) {
    ctx.log(`  failed: ${failed.suite ? `${failed.suite} > ` : ""}${failed.name}${failed.message ? `: ${failed.message.split("\n")[0]}` : ""}`);
  }
  ctx.emit({ type: "tests", jobId: ctx.job.id, stepId: ctx.step.id, summary });
  if (ctx.boolInput("failTaskOnFailedTests", false) && summary.failed > 0) {
    return { result: "failed", message: `There are ${summary.failed} failed test(s).` };
  }
  return { result: "succeeded" };
}
async function publishCoverage(ctx) {
  const location = ctx.input("summaryFileLocation");
  if (!location) return { result: "failed", message: "Coverage task: 'summaryFileLocation' is required." };
  const patterns = location.split(/\r?\n|;/).map((p) => p.trim()).filter(Boolean);
  const files = await findFiles(ctx, ctx.backend.paths.sources, patterns);
  if (files.length === 0) {
    ctx.warn(`No coverage file was found at ${patterns.join(", ")}.`);
    return { result: "succeeded" };
  }
  const keepDir = path16.join(ctx.io.runDir, "coverage", safe2(ctx.job.id));
  fs12.mkdirSync(keepDir, { recursive: true });
  for (const file of files) {
    const content = await ctx.backend.readFile(file);
    if (!content) continue;
    fs12.writeFileSync(path16.join(keepDir, safe2(ctx.backend.p.basename(file))), content);
    const summary = parseCoverage(content.toString("utf8"));
    if (!summary) {
      ctx.warn(`${file} is neither Cobertura XML nor lcov; it was stored but not summarised.`);
      continue;
    }
    const pct = summary.linesTotal ? (summary.linesCovered / summary.linesTotal * 100).toFixed(1) : "0.0";
    ctx.log(`${ctx.backend.p.basename(file)} (${summary.format}): ${summary.linesCovered}/${summary.linesTotal} lines covered (${pct}%) in ${summary.files.length} file(s).`);
    ctx.emit({ type: "coverage", jobId: ctx.job.id, stepId: ctx.step.id, summary });
  }
  ctx.log("The coverage summary is drawn locally from this file; nothing was uploaded to Azure DevOps.");
  return { result: "succeeded" };
}

// packages/engine-local/src/engine.ts
var EventQueue = class {
  items = [];
  waiters = [];
  closed = false;
  push(event) {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value: event, done: false });
    else this.items.push(event);
  }
  close() {
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ value: void 0, done: true });
  }
  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.items.length > 0) return Promise.resolve({ value: this.items.shift(), done: false });
        if (this.closed) return Promise.resolve({ value: void 0, done: true });
        return new Promise((resolve10) => this.waiters.push(resolve10));
      }
    };
  }
};
var Semaphore = class {
  constructor(free) {
    this.free = free;
  }
  free;
  waiting = [];
  async acquire() {
    if (this.free > 0) {
      this.free--;
      return;
    }
    await new Promise((resolve10) => this.waiting.push(resolve10));
  }
  release() {
    const next = this.waiting.shift();
    if (next) next();
    else this.free++;
  }
};
var safe3 = (name) => name.replace(/[^A-Za-z0-9._-]/g, "_");
var succeededSoFar = (status) => status === "Succeeded" || status === "SucceededWithIssues";
var LocalEngine = class {
  id = "local";
  settings;
  constructor(options) {
    this.settings = {
      hostScratchDir: path17.join(os3.tmpdir(), "azpl"),
      maxParallelJobs: 2,
      keepContainersOnFailure: false,
      matchHostedHardware: false,
      platform: process.platform,
      ...options
    };
  }
  start(plan, io) {
    const run = new Run(plan, io, this.settings);
    void run.main();
    return { events: run.queue, cancel: () => run.cancel() };
  }
};
var Run = class {
  constructor(plan, io, settings) {
    this.plan = plan;
    this.io = io;
    this.settings = settings;
    this.state = new RunState(plan.pipeline);
    this.slots = new Semaphore(Math.max(1, settings.maxParallelJobs));
    this.buildNumber = plan.buildNumber;
    this.baseVars = staticVariables(io.workspaceRoot, plan.pipeline.file, { ...io.config.variables, ...plan.variables });
  }
  plan;
  io;
  settings;
  queue = new EventQueue();
  state;
  gaps = [];
  cancelSignal = new AbortController();
  /** Secret values seen anywhere in the run; every log line is masked against them. */
  secrets = /* @__PURE__ */ new Set();
  baseVars;
  buildNumber;
  startTime = /* @__PURE__ */ new Date();
  slots;
  groupSlots = /* @__PURE__ */ new Map();
  results = /* @__PURE__ */ new Map();
  imageLocks = /* @__PURE__ */ new Map();
  secretCache = /* @__PURE__ */ new Map();
  dockerClient;
  emit(event) {
    this.queue.push(event);
  }
  docker() {
    this.dockerClient ??= DockerClient.connect(this.settings.dockerHost);
    return this.dockerClient;
  }
  /** One prompt per secret for the whole run, however many jobs need it. */
  secret(name, group) {
    const key = `${group}/${name}`;
    let pending = this.secretCache.get(key);
    if (!pending) {
      pending = this.io.getSecret(name, group).then((value) => {
        if (value) this.secrets.add(value);
        return value;
      });
      this.secretCache.set(key, pending);
    }
    return pending;
  }
  async cancel() {
    this.state.canceled = true;
    this.cancelSignal.abort();
  }
  /** Makes sure an image is present: builds the built-in ones, pulls the rest. Concurrent jobs share one attempt. */
  ensureImage = async (image, log) => {
    const running = this.imageLocks.get(image);
    if (running) {
      log(`Waiting for image ${image}, which another job is preparing`);
      return running;
    }
    const attempt = (async () => {
      const docker = await this.docker();
      const present = await docker.imageInfo(image);
      if (present) {
        log(`Image ${image} (${present.RepoDigests?.[0] ?? present.Id})`);
        return;
      }
      if (image.startsWith(`${BUILT_IN_IMAGE}:`)) {
        const release2 = image.slice(BUILT_IN_IMAGE.length + 1);
        const context = path17.join(this.settings.imagesDir, "ubuntu");
        if (!fs13.existsSync(path17.join(context, "Dockerfile"))) throw new Error(`The Dockerfile for the built-in image is missing from ${context}.`);
        log(`Building ${image} from ${context}. This happens once; later runs reuse the image.`);
        await docker.build(packFiles(listDirectory(context)), image, { UBUNTU_VERSION: release2 }, (text2) => {
          for (const line of text2.split("\n")) if (line.trim()) log(line.trimEnd());
        });
        log(`Built ${image}`);
      } else {
        log(`Pulling ${image}`);
        await docker.pull(image, log);
        const pulled = await docker.imageInfo(image);
        log(`Pulled ${image} (${pulled?.RepoDigests?.[0] ?? pulled?.Id ?? "unknown digest"})`);
      }
    })();
    this.imageLocks.set(image, attempt);
    try {
      await attempt;
    } catch (err) {
      this.imageLocks.delete(image);
      throw err;
    }
  };
  async main() {
    const { plan } = this;
    this.emit({ type: "run.started", runId: this.io.runId, at: Date.now() });
    try {
      for (const pj of plan.jobs) {
        if (pj.action !== "reuse" || !pj.reused) continue;
        this.state.jobs.set(pj.job.id, { result: pj.reused.result, outputs: pj.reused.outputs });
        this.emit({
          type: "job.finished",
          jobId: pj.job.id,
          result: pj.reused.result,
          message: `Not run again: result and outputs reused from ${pj.reused.runId}.`,
          outputs: pj.reused.outputs,
          at: Date.now()
        });
      }
      const stages = /* @__PURE__ */ new Map();
      for (const stage of plan.pipeline.stages) {
        stages.set(
          stage.id,
          (async () => {
            await Promise.resolve();
            await Promise.all(stage.dependsOn.map((id) => stages.get(id)));
            await this.runStage(stage);
          })()
        );
      }
      await Promise.all(stages.values());
    } catch (err) {
      this.gaps.push(`The run stopped on an internal error: ${err.message}`);
      this.results.set("__internal", "failed");
    }
    this.emit({ type: "run.finished", result: this.overall(), gaps: this.gaps, at: Date.now() });
    this.queue.close();
  }
  overall() {
    const results = [...this.results.values()];
    if (results.includes("failed")) return "failed";
    if (this.state.canceled || results.includes("canceled")) return "canceled";
    if (this.gaps.length > 0 || results.includes("succeededWithGaps") || results.includes("unsupported")) return "succeededWithGaps";
    if (results.includes("succeededWithIssues")) return "succeededWithIssues";
    if (results.length > 0 && results.every((r) => r === "skipped")) return "skipped";
    return "succeeded";
  }
  finishJob(job, result, message, outputs = {}, container) {
    this.state.jobs.set(job.id, { result, outputs });
    this.results.set(job.id, result);
    this.emit({ type: "job.finished", jobId: job.id, result, message, outputs, container, at: Date.now() });
  }
  /** Asks the host when a condition cannot be decided from what is known locally (D3). */
  async decide(what, condition, verdict) {
    if (!(verdict instanceof Unknown)) return verdict;
    return this.io.confirm(`${what} has the condition '${condition}', which depends on a value that is not known locally (${verdict.reason}). Run it anyway?`);
  }
  async runStage(stage) {
    const planned = this.plan.jobs.filter((pj) => pj.job.stageId === stage.id && pj.action === "run");
    if (planned.length === 0) return;
    const all = (result, message) => planned.forEach((pj) => this.finishJob(pj.job, result, message));
    if (this.state.canceled) return all("canceled", "The run was canceled before this stage started.");
    try {
      const { bag, unknown } = await this.variables(stage, void 0, void 0);
      const verdict = evalStageCondition(stage, this.state, variablesContext(lookup2(bag, unknown)));
      if (!await this.decide(`Stage '${stage.displayName}'`, stage.condition, verdict)) {
        return all("skipped", stage.dependsOn.length ? `Stage skipped: its condition '${stage.condition}' was false.` : "Stage skipped by its condition.");
      }
    } catch (err) {
      if (!(err instanceof ExprError)) throw err;
      return all("failed", `Stage condition could not be evaluated: ${err.message}`);
    }
    const jobs = /* @__PURE__ */ new Map();
    for (const pj of planned) {
      jobs.set(
        pj.job.id,
        (async () => {
          await Promise.resolve();
          const waits = pj.job.dependsOn.flatMap((dep) => planned.filter((other) => other.job.name === dep).map((other) => jobs.get(other.job.id)));
          await Promise.all(waits);
          await this.runJob(pj, stage);
        })()
      );
    }
    await Promise.all(jobs.values());
  }
  async runJob(pj, stage) {
    const { job } = pj;
    try {
      if (this.state.canceled) return this.finishJob(job, "canceled", "The run was canceled before this job started.");
      const { bag, unknown } = await this.variables(stage, job, void 0);
      const verdict = evalJobCondition(stage, job, this.state, variablesContext(lookup2(bag, unknown)));
      if (!await this.decide(`Job '${job.displayName}'`, job.condition, verdict)) {
        const blocked = job.dependsOn.filter((dep) => !["Succeeded", "SucceededWithIssues"].includes(this.state.jobStatus(stage.id, dep) ?? ""));
        return this.finishJob(
          job,
          "skipped",
          blocked.length ? `Skipped: ${blocked.join(", ")} did not succeed.` : `Skipped: the condition '${job.condition}' was false.`
        );
      }
      const target = resolveTarget(job, this.io.config, this.settings.platform);
      if (target.kind === "unsupported") {
        this.gaps.push(`${job.displayName}: not run. ${target.reason}`);
        return this.finishJob(job, "unsupported", target.reason);
      }
      const groupKey = `${stage.id}.${job.name}`;
      let group;
      if (job.matrixLeg && job.maxParallel && job.maxParallel > 0) {
        group = this.groupSlots.get(groupKey) ?? new Semaphore(job.maxParallel);
        this.groupSlots.set(groupKey, group);
      }
      await group?.acquire();
      await this.slots.acquire();
      try {
        if (this.state.canceled) return this.finishJob(job, "canceled", "The run was canceled before this job started.");
        this.emit({ type: "job.started", jobId: job.id, image: describeTarget(target), at: Date.now() });
        const runner = new JobRunner(this, pj, stage);
        const done = await runner.execute(target.kind === "host" ? void 0 : target.image);
        this.finishJob(job, done.result, done.message, done.outputs, done.shell);
      } finally {
        this.slots.release();
        group?.release();
      }
    } catch (err) {
      this.finishJob(job, "failed", `The job stopped on an error: ${err.message}`);
    }
  }
  /**
   * The variables in scope for a stage or a job. Without a backend this is what
   * conditions see before the job starts; with one, the agent's own variables are added.
   * `unknown` lists names that cannot be known locally.
   */
  async variables(stage, job, backend) {
    const { plan, io } = this;
    const bag = new VariableBag();
    const notes = [];
    const unknownNames = /* @__PURE__ */ new Set();
    let unsuppliedGroup;
    for (const [name, value] of Object.entries(this.baseVars)) bag.set(name, value);
    bag.set("Build.BuildId", String(plan.buildId));
    bag.set("Build.BuildNumber", this.buildNumber);
    bag.set("Build.BuildUri", `vstfs:///Build/Build/${plan.buildId}`);
    bag.set("System.StageName", stage.id);
    bag.set("System.StageDisplayName", stage.displayName);
    bag.set("System.StageAttempt", "1");
    if (job) {
      bag.set("System.PhaseName", job.name);
      bag.set("System.PhaseDisplayName", job.displayName);
      bag.set("System.JobName", job.matrixLeg?.name ?? "__default");
      bag.set("System.JobDisplayName", job.displayName);
      bag.set("System.JobAttempt", "1");
      bag.set("System.JobId", crypto5.randomUUID());
      bag.set("Agent.JobName", job.displayName);
      if (job.kind === "deployment") {
        bag.set("Environment.Name", job.environment ?? "");
        bag.set("Strategy.Name", "runOnce");
      }
    }
    if (backend) {
      const p = backend.paths;
      const agent = {
        "Agent.OS": backend.os,
        "Agent.OSArchitecture": backend.arch,
        "Agent.Name": "azp-local",
        "Agent.MachineName": backend.kind === "host" ? os3.hostname() : "azp-local",
        "Agent.Id": "1",
        "Agent.Version": "4.0.0",
        "Agent.JobStatus": "Succeeded",
        "Agent.WorkFolder": backend.p.dirname(p.workspace),
        "Agent.RootDirectory": backend.p.dirname(p.workspace),
        "Agent.HomeDirectory": backend.p.dirname(p.workspace),
        "Agent.BuildDirectory": p.workspace,
        "Agent.TempDirectory": p.temp,
        "Agent.ToolsDirectory": p.tools,
        "Pipeline.Workspace": p.workspace,
        "Build.SourcesDirectory": p.sources,
        "Build.Repository.LocalPath": p.sources,
        "System.DefaultWorkingDirectory": p.sources,
        "Build.ArtifactStagingDirectory": p.artifacts,
        "Build.StagingDirectory": p.artifacts,
        "Build.BinariesDirectory": p.binaries,
        "System.ArtifactsDirectory": p.artifacts,
        "System.WorkFolder": backend.p.dirname(p.workspace),
        "Common.TestResultsDirectory": backend.p.join(p.workspace, "TestResults")
      };
      for (const [name, value] of Object.entries(agent)) bag.set(name, value);
    }
    const ctx = {
      named: {
        variables: variablesContext((name) => bag.get(name)),
        pipeline: { startTime: this.startTime.toISOString() },
        ...job ? jobContext(stage, job, this.state) : {}
      },
      counter: this.settings.counter
    };
    if (!job) ctx.named.dependencies = jobContext(stage, { dependsOn: [] }, this.state).stageDependencies;
    for (const decl of [...plan.pipeline.variables, ...stage.variables, ...job?.variables ?? []]) {
      if (decl.group) {
        const group = Object.entries(io.config.variableGroups).find(([name]) => name.toLowerCase() === decl.group.toLowerCase())?.[1];
        if (!group) {
          unsuppliedGroup = decl.group;
          notes.push(`Variable group '${decl.group}' has no local values. Add it under 'variableGroups:' in .azp-local.yml.`);
          continue;
        }
        for (const [name, entry] of Object.entries(group)) {
          if (!entry.secret) {
            bag.set(name, entry.value ?? "");
            continue;
          }
          const value = backend ? await this.secret(name, decl.group) : void 0;
          if (value === void 0) {
            unknownNames.add(name.toLowerCase());
            if (backend) notes.push(`Secret '${name}' of variable group '${decl.group}' was not supplied; $(${name}) is left as written.`);
          } else {
            bag.set(name, value, { secret: true });
          }
        }
      } else {
        let value = decl.value;
        try {
          value = evalRuntimeValue(decl.value, ctx);
        } catch (err) {
          if (!(err instanceof ExprError)) throw err;
          notes.push(`Variable '${decl.name}': ${err.message}`);
          value = "";
        }
        if (value instanceof Unknown) {
          unknownNames.add(decl.name.toLowerCase());
          notes.push(`Variable '${decl.name}' depends on a value that is not known locally (${value.reason}).`);
        } else {
          bag.set(decl.name, value, { readonly: decl.readonly });
        }
      }
    }
    for (const [name, value] of Object.entries(job?.matrixLeg?.variables ?? {})) bag.set(name, value);
    for (const [name, value] of Object.entries({ ...io.config.variables, ...plan.variables })) bag.set(name, value);
    return {
      bag,
      notes,
      unknown: unsuppliedGroup ? new Unknown(`it may come from variable group '${unsuppliedGroup}', which has no local values`) : unknownNames
    };
  }
};
function lookup2(bag, unknown) {
  return (name) => {
    const value = bag.get(name);
    if (value !== void 0) return value;
    if (unknown instanceof Unknown) return unknown;
    return unknown.has(name.toLowerCase()) ? new Unknown(`secret '${name}' was not supplied`) : void 0;
  };
}
var JobRunner = class {
  constructor(run, pj, stage) {
    this.run = run;
    this.pj = pj;
    this.stage = stage;
    this.job = pj.job;
    run.cancelSignal.signal.addEventListener("abort", () => this.jobAbort.abort(), { once: true });
  }
  run;
  pj;
  stage;
  job;
  backend;
  bag = new VariableBag();
  unknown = /* @__PURE__ */ new Set();
  status = "Succeeded";
  hasGaps = false;
  canceled = false;
  outputs = {};
  prepended = [];
  postSteps = [];
  jobAbort = new AbortController();
  /** Uploads started by logging commands; awaited before the step ends. */
  pending = [];
  completed;
  failure;
  log(stepId, line, stream = "out") {
    this.run.emit({ type: "log", jobId: this.job.id, stepId, line: maskSecrets(line, [...this.run.secrets]), stream, at: Date.now() });
  }
  issue(stepId, severity, message, source) {
    const masked = maskSecrets(message, [...this.run.secrets]);
    this.run.emit({ type: "issue", jobId: this.job.id, stepId, severity, message: masked, source });
    this.log(stepId, `##[${severity}]${message}`);
  }
  setStatus(next) {
    if (this.status === "Failed" || this.status === "Canceled") return;
    this.status = next;
    this.bag.set("Agent.JobStatus", next);
  }
  async initialize(image) {
    const { run, job } = this;
    const settings = run.settings;
    if (image) {
      const docker = await run.docker();
      this.backend = new ContainerBackend({
        docker,
        image,
        runId: run.io.runId,
        jobId: job.id,
        services: job.services,
        env: job.container?.env,
        mountWorkspace: run.io.config.workspace === "mount" ? run.io.workspaceRoot : void 0,
        dockerSocket: run.io.config.dockerSocket,
        matchHostedHardware: settings.matchHostedHardware,
        ensureImage: run.ensureImage
      });
    } else {
      this.backend = new HostBackend(settings.hostScratchDir, path17.join(settings.homeDir, "tools"), `${safe3(run.io.runId)}-${crypto5.randomBytes(2).toString("hex")}`);
      if (Object.keys(job.services).length > 0) this.issue("__init", "warning", "Service containers are not started in host mode.");
    }
    await this.backend.prepare((line) => this.log("__init", line));
    const { bag, unknown, notes } = await run.variables(this.stage, job, this.backend);
    this.bag = bag;
    this.unknown = unknown;
    this.log("__init", `Job: ${job.displayName}`);
    this.log("__init", `Pool: ${job.pool.label || "(default)"} -> ${this.backend.label}`);
    this.log("__init", `Agent.OS ${this.backend.os} ${this.backend.arch}, sources at ${this.backend.paths.sources}`);
    for (const note of notes) this.issue("__init", "warning", note);
  }
  async execute(image) {
    const { run, job } = this;
    run.emit({ type: "step.started", jobId: job.id, stepId: "__init", displayName: "Initialize job", at: Date.now() });
    try {
      await this.initialize(image);
      run.emit({ type: "step.finished", jobId: job.id, stepId: "__init", result: "succeeded", at: Date.now() });
    } catch (err) {
      const message = err.message;
      this.issue("__init", "error", message);
      run.emit({ type: "step.finished", jobId: job.id, stepId: "__init", result: "failed", message: message.split(/\r?\n/)[0], at: Date.now() });
      await this.backend?.dispose(false).catch(() => void 0);
      return { result: "failed", message: `Could not start the job: ${message.split("\n")[0]}`, outputs: {} };
    }
    let timer;
    if (job.timeoutInMinutes && job.timeoutInMinutes > 0) {
      timer = setTimeout(() => {
        this.canceled = true;
        this.failure = `The job ran longer than its timeout of ${job.timeoutInMinutes} minute(s).`;
        this.jobAbort.abort();
      }, job.timeoutInMinutes * 6e4);
    }
    let stopped = false;
    for (const step of job.steps) {
      if (stopped) {
        run.emit({ type: "step.finished", jobId: job.id, stepId: step.id, result: "skipped", message: "Comes after the step that was selected to run.", at: Date.now() });
        continue;
      }
      await this.runStep(step.id, step, (ctx) => this.invoke(ctx, step.run));
      if (this.pj.untilStepId === step.id) stopped = true;
    }
    if (!stopped) {
      const posts = [...this.postSteps].reverse();
      for (const [index, post] of posts.entries()) {
        const synthetic = { ...job.steps[0], id: `__post${index + 1}`, displayName: post.displayName, condition: "always()", env: {}, enabled: true, continueOnError: false, timeoutInMinutes: void 0, retryCount: void 0 };
        await this.runStep(synthetic.id, synthetic, post.run, post.displayName);
      }
    }
    if (timer) clearTimeout(timer);
    const wasCanceled = this.canceled || run.state.canceled;
    const failed = this.status === "Failed";
    const keep = failed && !wasCanceled && run.settings.keepContainersOnFailure;
    const shell = await this.backend.dispose(keep).catch(() => void 0);
    let result;
    if (wasCanceled) result = "canceled";
    else if (failed) result = job.continueOnError ? "succeededWithIssues" : "failed";
    else if (this.hasGaps) result = "succeededWithGaps";
    else result = this.status === "SucceededWithIssues" ? "succeededWithIssues" : "succeeded";
    return { result, message: this.failure, outputs: this.outputs, shell };
  }
  async runStep(stepId, step, body, syntheticName) {
    const { run, job } = this;
    const finish = (result, message) => run.emit({ type: "step.finished", jobId: job.id, stepId, result, message, at: Date.now() });
    if (!step.enabled) return finish("skipped", "The step is disabled (enabled: false).");
    const canceled = this.canceled || run.state.canceled;
    let proceed;
    try {
      const verdict = evalStepCondition(step.condition, this.status, variablesContext(lookup2(this.bag, this.unknown)), canceled);
      proceed = verdict instanceof Unknown ? await run.io.confirm(`Step '${step.displayName}' of ${job.displayName} has the condition '${step.condition}', which depends on a value that is not known locally (${verdict.reason}). Run it anyway?`) : verdict;
    } catch (err) {
      if (!(err instanceof ExprError)) throw err;
      run.emit({ type: "step.started", jobId: job.id, stepId, displayName: syntheticName, at: Date.now() });
      this.issue(stepId, "error", `The condition '${step.condition}' could not be evaluated: ${err.message}`);
      this.setStatus("Failed");
      this.failure ??= `Step '${step.displayName}' has a condition that could not be evaluated.`;
      return finish("failed", err.message);
    }
    if (!proceed) {
      if (canceled) return finish("canceled", "The run was canceled.");
      const reason = succeededSoFar(this.status) ? `Its condition was false: ${step.condition}` : `An earlier step failed and its condition is ${step.condition}`;
      return finish("skipped", reason);
    }
    run.emit({ type: "step.started", jobId: job.id, stepId, displayName: syntheticName, at: Date.now() });
    const attempts = 1 + Math.max(0, step.retryCount ?? 0);
    let outcome = { result: "failed" };
    for (let attempt = 1; attempt <= attempts; attempt++) {
      outcome = await this.attempt(stepId, step, body);
      if (outcome.result !== "failed" || attempt === attempts || this.jobAbort.signal.aborted) break;
      this.log(stepId, `##[warning]The step failed; retrying (attempt ${attempt + 1} of ${attempts}).`);
    }
    if (outcome.gap) {
      this.hasGaps = true;
      run.gaps.push(`${job.displayName} / ${step.displayName}: ${outcome.gap}.`);
    }
    switch (outcome.result) {
      case "failed":
        if (outcome.message) this.issue(stepId, "error", outcome.message);
        if (step.continueOnError) {
          this.setStatus("SucceededWithIssues");
          return finish("succeededWithIssues", `${outcome.message ?? "Failed"} (continueOnError)`);
        }
        this.setStatus("Failed");
        this.failure ??= `Step '${step.displayName}' failed.`;
        return finish("failed", outcome.message);
      case "unsupported":
        this.hasGaps = true;
        if (!outcome.gap) run.gaps.push(`${job.displayName} / ${step.displayName}: not run. ${outcome.message ?? ""}`.trim());
        if (outcome.message) this.issue(stepId, "warning", outcome.message);
        return finish("unsupported", outcome.message);
      case "succeededWithIssues":
        this.setStatus("SucceededWithIssues");
        return finish("succeededWithIssues", outcome.message);
      case "canceled":
        return finish("canceled", outcome.message);
      default:
        return finish(outcome.result, outcome.message);
    }
  }
  async attempt(stepId, step, body) {
    const stepAbort = new AbortController();
    const onJobAbort = () => stepAbort.abort();
    this.jobAbort.signal.addEventListener("abort", onJobAbort, { once: true });
    let timedOut = false;
    const timer = step.timeoutInMinutes && step.timeoutInMinutes > 0 ? setTimeout(() => {
      timedOut = true;
      stepAbort.abort();
    }, step.timeoutInMinutes * 6e4) : void 0;
    this.completed = void 0;
    this.pending = [];
    let outcome;
    try {
      outcome = await body(this.context(stepId, step, stepAbort.signal));
      await Promise.all(this.pending);
    } catch (err) {
      outcome = { result: "failed", message: err.message };
    } finally {
      if (timer) clearTimeout(timer);
      this.jobAbort.signal.removeEventListener("abort", onJobAbort);
    }
    if (timedOut) return { result: "failed", message: `The step timed out after ${step.timeoutInMinutes} minute(s).` };
    if (stepAbort.signal.aborted) return { result: "canceled", message: "The step was stopped because the run was canceled." };
    const completed = this.completed;
    if (outcome.result === "succeeded" && completed) {
      outcome = { ...outcome, result: completed.result, message: completed.result === "succeeded" ? outcome.message : completed.message };
    }
    return outcome;
  }
  invoke(ctx, stepRun) {
    switch (stepRun.kind) {
      case "script":
        return runScript(ctx, stepRun.shell, ctx.expand(stepRun.script), { cwd: ctx.step.workingDirectory && ctx.expand(ctx.step.workingDirectory), failOnStderr: ctx.step.failOnStderr });
      case "checkout":
        return checkout(ctx, stepRun.repository);
      case "download":
        return download(ctx, { source: stepRun.source, artifact: ctx.expand(stepRun.artifact), patterns: stepRun.patterns, shortcut: true });
      case "publish":
        return publish(ctx, ctx.expand(stepRun.path), ctx.expand(stepRun.artifact));
      case "task":
        return this.invokeTask(ctx, stepRun);
    }
  }
  async invokeTask(ctx, task) {
    const label = task.version ? `${task.name}@${task.version}` : task.name;
    switch (task.override?.action) {
      case "skip":
        ctx.log(`${label} is skipped locally, as .azp-local.yml says.`);
        return { result: "skipped", message: "Skipped by .azp-local.yml.", gap: `${label} was skipped by .azp-local.yml` };
      case "fail":
        return { result: "failed", message: `${label} is set to fail locally in .azp-local.yml.` };
      case "script":
        return runReplacementScript(ctx, task.override.script, label);
      case "path":
        return runTaskFromFolder(ctx, task.override.path);
    }
    const p = ctx.backend.paths;
    switch (task.name.toLowerCase()) {
      case "cmdline":
        return runScriptTask(ctx, "cmdline");
      case "bash":
        return runScriptTask(ctx, "bash");
      case "powershell":
        return runScriptTask(ctx, "powershell");
      case "usenode":
      case "nodetool":
        return useNode(ctx);
      case "cache":
        return cache2(ctx);
      case "publishpipelineartifact":
        return publish(ctx, ctx.input("targetPath", "path") ?? p.workspace, ctx.input("artifact", "artifactName") ?? "");
      case "publishbuildartifacts":
        return publish(ctx, ctx.input("PathtoPublish") ?? p.artifacts, ctx.input("ArtifactName") ?? "drop");
      case "downloadpipelineartifact":
        return download(ctx, {
          source: (ctx.input("buildType", "source") ?? "current").toLowerCase() === "specific" ? "another pipeline" : "current",
          artifact: ctx.input("artifact", "artifactName") ?? "",
          targetPath: ctx.input("targetPath", "path", "downloadPath"),
          patterns: ctx.input("patterns", "itemPattern"),
          shortcut: false
        });
      case "downloadbuildartifacts":
        return download(ctx, {
          source: (ctx.input("buildType") ?? "current").toLowerCase() === "specific" ? "another pipeline" : "current",
          artifact: ctx.input("artifactName") ?? "",
          targetPath: ctx.input("downloadPath") ?? p.artifacts,
          patterns: ctx.input("itemPattern"),
          shortcut: true
        });
      case "publishtestresults":
        return publishTestResults(ctx);
      case "publishcodecoverageresults":
        return publishCoverage(ctx);
    }
    if (task.tier === 2) {
      return {
        result: "unsupported",
        message: `The task package for ${label} is not available locally. Map a folder that holds its task.json under 'tasks:' in .azp-local.yml ({ path: ... }), or choose skip, fail or a replacement script.`
      };
    }
    return { result: "unsupported", message: `${label} cannot run locally. ${task.tierReason}` };
  }
  context(stepId, step, signal) {
    const { run, job, backend } = this;
    const bag = this.bag;
    const rawInputs = step.run.kind === "task" ? step.run.inputs : {};
    const inputs = Object.fromEntries(Object.entries(rawInputs).map(([name, value]) => [name, bag.expand(value)]));
    const artifactDirs = () => {
      const reused = [...new Set(run.plan.jobs.flatMap((pj) => pj.action === "reuse" && pj.reused ? [pj.reused.runId] : []))];
      return [run.io.runDir, ...reused.map((id) => run.io.resolveRunDir(id))].map((dir) => path17.join(dir, "artifacts"));
    };
    const ctx = {
      job,
      step,
      backend,
      vars: bag,
      io: run.io,
      plan: run.plan,
      settings: run.settings,
      signal,
      inputs,
      input: (name, ...aliases) => {
        const wanted = [name, ...aliases].map((n) => n.toLowerCase());
        for (const want of wanted) {
          const key = Object.keys(inputs).find((k) => k.toLowerCase() === want);
          if (key !== void 0 && inputs[key] !== "") return inputs[key];
        }
        return void 0;
      },
      boolInput: (name, fallback) => {
        const value = ctx.input(name)?.toLowerCase();
        return value === "true" ? true : value === "false" ? false : fallback;
      },
      expand: (text2) => bag.expand(text2),
      resolve: (target, base = backend.paths.sources) => backend.p.resolve(base, target),
      log: (line) => this.log(stepId, line),
      warn: (message) => this.issue(stepId, "warning", message),
      error: (message) => this.issue(stepId, "error", message),
      emit: (event) => run.emit(event),
      exec: (cmd, opts = {}) => this.exec(stepId, step, cmd, signal, opts),
      setVariable: (name, value, flags = {}) => this.setVariable(stepId, step, name, value, flags),
      prependPath: (dir) => {
        this.prepended.unshift(dir);
      },
      addPostStep: (displayName, runPost) => {
        this.postSteps.push({ displayName, run: runPost });
      },
      jobStatus: () => this.status,
      findArtifact: (name) => artifactDirs().map((dir) => artifactPath(dir, name)).find((dir) => !!dir && fs13.existsSync(dir)),
      listArtifacts: () => {
        const names = /* @__PURE__ */ new Set();
        for (const dir of artifactDirs()) {
          try {
            fs13.readdirSync(dir, { withFileTypes: true }).forEach((entry) => entry.isDirectory() && names.add(entry.name));
          } catch {
          }
        }
        return [...names];
      }
    };
    return ctx;
  }
  environment(step, extra = {}) {
    const { backend, bag } = this;
    const env = backend.kind === "host" ? { ...process.env } : {};
    const set = (name, value) => {
      if (backend.os === "Windows_NT") {
        for (const key of Object.keys(env)) if (key.toLowerCase() === name.toLowerCase()) delete env[key];
      }
      env[name] = value;
    };
    for (const [name, value] of Object.entries(bag.toEnv())) set(name, value);
    for (const [name, value] of Object.entries(step.env)) set(name, bag.expand(value));
    for (const [name, value] of Object.entries(extra)) set(name, value);
    set("PATH", [...this.prepended, backend.basePath].join(backend.pathDelimiter));
    return env;
  }
  async exec(stepId, step, cmd, signal, opts) {
    let sawStderr = false;
    const out = new LineSplitter((line) => this.line(stepId, step, line, "out"));
    const err = new LineSplitter((line) => {
      sawStderr = true;
      this.line(stepId, step, line, "err");
    });
    const code = await this.backend.exec({
      cmd,
      env: this.environment(step, opts.env),
      cwd: opts.cwd ?? this.backend.paths.sources,
      onOut: (chunk) => out.push(chunk),
      onErr: (chunk) => err.push(chunk),
      signal,
      verbatim: opts.verbatim
    });
    out.flush();
    err.flush();
    return { code, sawStderr };
  }
  line(stepId, step, line, stream) {
    const command = parseLoggingCommand(line);
    if (command) {
      try {
        this.command(stepId, step, command);
      } catch (err) {
        this.issue(stepId, "warning", `Logging command ${command.area}.${command.action} failed: ${err.message}`);
      }
    }
    this.log(stepId, line, stream);
  }
  setVariable(stepId, step, name, value, flags) {
    if (!name) return;
    if (this.bag.entry(name)?.readonly) {
      this.issue(stepId, "warning", `Variable '${name}' is read-only and was not changed.`);
      return;
    }
    if (flags.isSecret && value) this.run.secrets.add(value);
    if (flags.isOutput) {
      const key = `${step.refName ?? step.id}.${name}`;
      this.bag.set(key, value, { secret: flags.isSecret });
      if (flags.isSecret) this.issue(stepId, "warning", `Secret output variable '${key}' is available in this job only; it is not stored for other jobs.`);
      else this.outputs[key] = value;
    } else {
      this.bag.set(name, value, { secret: flags.isSecret, readonly: flags.isReadOnly });
    }
    this.run.emit({ type: "variable.set", jobId: this.job.id, stepId, name, isOutput: !!flags.isOutput, isSecret: !!flags.isSecret });
  }
  /** Maps a path a step reports (inside the job) back to the file in the workspace. */
  workspaceFile(reported) {
    if (!reported) return void 0;
    const { p, paths } = this.backend;
    const absolute = p.isAbsolute(reported) ? reported : p.join(paths.sources, reported);
    const relative7 = p.relative(paths.sources, absolute);
    if (relative7.startsWith("..")) return void 0;
    return path17.join(this.run.io.workspaceRoot, ...relative7.split(/[\\/]/));
  }
  command(stepId, step, command) {
    const { run, job, backend } = this;
    const prop = command.properties;
    const flag = (name) => (prop[name] ?? "").toLowerCase() === "true";
    const key = `${command.area}.${command.action}`;
    switch (key) {
      case "task.setvariable":
        return this.setVariable(stepId, step, prop.variable ?? "", command.data, { isOutput: flag("isoutput"), isSecret: flag("issecret"), isReadOnly: flag("isreadonly") });
      case "task.setsecret":
        if (command.data) run.secrets.add(command.data);
        return;
      case "task.prependpath":
        if (command.data.trim()) this.prepended.unshift(command.data.trim());
        return;
      case "task.logissue":
      case "task.issue": {
        const file = this.workspaceFile(prop.sourcepath);
        run.emit({
          type: "issue",
          jobId: job.id,
          stepId,
          severity: (prop.type ?? "error").toLowerCase() === "warning" ? "warning" : "error",
          message: maskSecrets(command.data, [...run.secrets]),
          source: file ? { file, line: Number(prop.linenumber) || 1, column: Number(prop.columnnumber) || 1 } : void 0
        });
        return;
      }
      case "task.complete": {
        const result = (prop.result ?? "Succeeded").toLowerCase();
        this.completed = {
          result: result === "failed" ? "failed" : result === "succeededwithissues" ? "succeededWithIssues" : result === "skipped" ? "skipped" : "succeeded",
          message: command.data || void 0
        };
        return;
      }
      case "task.uploadsummary":
      case "task.addattachment": {
        if (key === "task.addattachment" && (prop.type ?? "").toLowerCase() !== "distributedtask.core.summary") return;
        const source = command.data.trim();
        const name = prop.name ?? backend.p.basename(source);
        const dir = path17.join(run.io.runDir, "summaries", safe3(job.id));
        this.pending.push(
          backend.readFile(backend.p.resolve(backend.paths.sources, source)).then((content) => {
            if (!content) return this.issue(stepId, "warning", `Summary file not found: ${source}`);
            fs13.mkdirSync(dir, { recursive: true });
            const file = path17.join(dir, safe3(backend.p.basename(source)));
            fs13.writeFileSync(file, content);
            run.emit({ type: "summary", jobId: job.id, stepId, name, path: file });
          })
        );
        return;
      }
      case "artifact.upload": {
        const name = prop.artifactname ?? prop.containerfolder ?? job.name;
        const source = backend.p.resolve(backend.paths.sources, command.data.trim());
        const dest = artifactPath(path17.join(run.io.runDir, "artifacts"), name);
        if (!dest) return this.issue(stepId, "error", `artifact.upload was refused: ${artifactNameProblem(name) ?? `artifact name '${name}' is not allowed.`}`);
        this.pending.push(
          backend.copyOut(source, dest).then((copied) => {
            if (!copied) return this.issue(stepId, "warning", `artifact.upload: path not found: ${source}`);
            run.emit({ type: "artifact", jobId: job.id, name, path: dest, files: copied.files });
          })
        );
        return;
      }
      case "build.updatebuildnumber":
        run.buildNumber = command.data.trim();
        this.bag.set("Build.BuildNumber", run.buildNumber);
        run.emit({ type: "buildNumber", value: run.buildNumber });
        return;
      case "task.setprogress":
      case "task.debug":
      case "task.settaskvariable":
      case "task.uploadfile":
      case "task.setendpoint":
      case "build.addbuildtag":
      case "build.uploadlog":
      case "release.updatereleasename":
        return;
      // accepted; nothing to do locally
      default:
        this.log(stepId, `##[warning]Logging command '${key}' is not supported locally and was ignored.`);
    }
  }
};

// packages/engine-local/src/doctor.ts
var fs14 = __toESM(require("node:fs"), 1);
var gigabytes = (bytes) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;
async function checkDocker(pipelines, config, opts = {}) {
  const findings = [];
  const platform = opts.platform ?? process.platform;
  const images = /* @__PURE__ */ new Map();
  for (const job of pipelines.flatMap((p) => p.stages.flatMap((s) => s.jobs))) {
    const target = resolveTarget(job, config, platform);
    if (target.kind === "container") images.set(target.image, !!target.builtIn);
    for (const service of Object.values(job.services)) images.set(service.image, false);
  }
  let docker;
  try {
    docker = await DockerClient.connect(opts.dockerHost);
    const [version, info] = await Promise.all([docker.version(), docker.info()]);
    findings.push({ level: "ok", area: "Docker", message: `Docker ${version.Version} at ${docker.endpoint.label} (${info.OSType}/${info.Architecture}, ${info.NCPU} CPUs, ${gigabytes(info.MemTotal)} memory)` });
    if (info.OSType !== "linux") {
      findings.push({ level: "warning", area: "Docker", message: `The daemon runs ${info.OSType} containers. Linux jobs need it switched to Linux containers.` });
    }
    if (info.MemTotal < 7 * 1024 ** 3) {
      findings.push({ level: "info", area: "Docker", message: "Hosted agents have 7 GB of memory; this daemon has less, so memory-hungry steps may behave differently." });
    }
  } catch (err) {
    findings.push({
      level: images.size > 0 ? "error" : "info",
      area: "Docker",
      message: err.message.split("\n")[0],
      remedy: "The graph and expansion work without Docker. Running container jobs needs a daemon."
    });
  }
  if (docker) {
    for (const [image, builtIn] of images) {
      try {
        const present = await docker.imageInfo(image);
        if (present) findings.push({ level: "ok", area: "Images", message: `${image}: present (${gigabytes(present.Size)})` });
        else {
          findings.push({
            level: "info",
            area: "Images",
            message: builtIn ? `${image}: not built yet. It is built on first use, which takes a few minutes.` : `${image}: not present. It is pulled on first use.`
          });
        }
      } catch (err) {
        findings.push({ level: "warning", area: "Images", message: `${image}: ${err.message}` });
      }
    }
  }
  if (opts.storeDir) {
    try {
      fs14.mkdirSync(opts.storeDir, { recursive: true });
      const stat = fs14.statfsSync(opts.storeDir);
      const free = stat.bavail * stat.bsize;
      findings.push({
        level: free < 5 * 1024 ** 3 ? "warning" : "ok",
        area: "Disk",
        message: `${gigabytes(free)} free where runs, artifacts and caches are stored (${opts.storeDir})`
      });
    } catch {
    }
  }
  return findings;
}

// packages/cli/src/main.ts
var HELP = `azp-local - draw and run Azure Pipelines YAML on this machine

Usage
  azp-local graph  [file]            Print stages, jobs and steps as the portal lays them out
  azp-local expand [file]            Print the YAML after template expansion (the local finalYaml)
  azp-local run    [file] [options]  Run the pipeline, a stage, a job or part of a job
  azp-local doctor                   Check Docker, images, disk and what needs a decision in .azp-local.yml
  azp-local runs                     List past local runs

Selection (run)
  --stage <name>          Run one stage
  --from-stage <name>     Run a stage and every stage after it
  --job <name>            Run one job; add its matrix leg as job.leg to run a single leg
  --step <job>:<step>     Run a job up to and including one step
  --rerun-failed [run]    Run again what did not pass in a run (default: the last one)

Inputs
  --param name=value      Value for a pipeline parameter (repeatable)
  --var name=value        Value for a variable, e.g. Build.Reason=PullRequest (repeatable)
  --secrets <file>        NAME=value lines for variable-group secrets; keep it outside the repository.
                          Secrets are also read from AZP_SECRET_<NAME> environment variables.
  -y, --yes               Do not ask: proceed when a condition cannot be decided locally
  --allow-unisolated      Run even though .azp-local.yml weakens isolation (host mode, dockerSocket,
                          workspace: mount, paths outside the repository) and that was not approved
                          before. Without it, such a run asks in a terminal and is refused elsewhere.

Engine
  --max-parallel <n>      Jobs to run at once (default 2)
  --keep-on-failure       Keep the container of a failed job for debugging
  --match-hosted-hardware Limit containers to 2 CPUs and 7 GB, as hosted agents have
  --docker-host <url>     npipe://, unix:// or tcp:// address of the Docker daemon
  --allow-gaps            Exit 0 even when steps could not run locally (default: exit 3)

Common
  -C, --cwd <dir>         Repository root (default: current directory)
  --store <dir>           Where runs, artifacts and caches are kept
  --json                  graph: print the model as JSON
  --quiet                 run: print step results only, not their output
`;
var VALUE_FLAGS = /* @__PURE__ */ new Set(["stage", "from-stage", "job", "step", "param", "var", "secrets", "max-parallel", "docker-host", "cwd", "store"]);
function parseArgs(argv) {
  const flags = /* @__PURE__ */ new Map();
  const positional = [];
  const add = (name, value) => flags.set(name, [...flags.get(name) ?? [], value]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-y") add("yes", "true");
    else if (arg === "-C") add("cwd", argv[++i] ?? "");
    else if (arg === "-h") add("help", "true");
    else if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const name = eq > 0 ? arg.slice(2, eq) : arg.slice(2);
      if (eq > 0) add(name, arg.slice(eq + 1));
      else if (VALUE_FLAGS.has(name)) add(name, argv[++i] ?? "");
      else if (name === "rerun-failed" && argv[i + 1] && !argv[i + 1].startsWith("-") && /^run-/.test(argv[i + 1])) add(name, argv[++i]);
      else add(name, "true");
    } else positional.push(arg);
  }
  return { command: positional.shift() ?? "help", positional, flags };
}
var color = process.stdout.isTTY && !process.env.NO_COLOR;
var paint = (code, text2) => color ? `\x1B[${code}m${text2}\x1B[0m` : text2;
var dim = (text2) => paint(2, text2);
var bold = (text2) => paint(1, text2);
function resultMark(result) {
  switch (result) {
    case "succeeded":
      return paint(32, "ok  ");
    case "succeededWithIssues":
      return paint(33, "ok! ");
    case "succeededWithGaps":
      return paint(33, "gaps");
    case "failed":
      return paint(31, "FAIL");
    case "canceled":
      return paint(35, "stop");
    case "skipped":
      return dim("skip");
    case "unsupported":
      return paint(33, "n/a ");
    default:
      return dim("    ");
  }
}
function pairs(values, what) {
  const out = {};
  for (const value of values ?? []) {
    const eq = value.indexOf("=");
    if (eq <= 0) throw new Error(`${what} must be name=value, got '${value}'`);
    out[value.slice(0, eq)] = value.slice(eq + 1);
  }
  return out;
}
function printDiagnostics(diagnostics, root) {
  for (const d of diagnostics) {
    const where = d.source ? describeSource({ ...d.source, file: path18.relative(root, d.source.file) || d.source.file }) : "";
    console.error(`${d.severity === "error" ? paint(31, "error") : paint(33, d.severity)}  ${d.message}${where ? dim(`  ${where}`) : ""}`);
  }
}
function imagesDir() {
  const candidates = [path18.join(__dirname, "images"), path18.join(__dirname, "..", "images"), path18.join(__dirname, "..", "..", "images")];
  return candidates.find((dir) => fs15.existsSync(path18.join(dir, "ubuntu", "Dockerfile"))) ?? candidates[0];
}
function openWorkspace(args) {
  const root = path18.resolve(args.flags.get("cwd")?.[0] ?? process.cwd());
  const home = process.env.AZP_LOCAL_HOME ?? path18.join(os4.homedir(), ".azp-local");
  const id = `${path18.basename(root).replace(/[^A-Za-z0-9._-]/g, "_")}-${crypto6.createHash("sha1").update(root.toLowerCase()).digest("hex").slice(0, 10)}`;
  const storeDir = path18.resolve(args.flags.get("store")?.[0] ?? path18.join(home, "workspaces", id));
  return { root, home, storeDir, config: loadConfig(root) };
}
function pickPipeline(ws, args) {
  if (args.positional[0]) return path18.resolve(ws.root, args.positional[0]);
  const found = discoverPipelines(ws.root, ws.config);
  if (found.pipelines.length === 1) return found.pipelines[0];
  if (found.pipelines.length === 0) throw new Error(`No pipeline file was found in ${ws.root}. Pass the file as an argument.`);
  throw new Error(`Several pipeline files were found; pass one as an argument:
${found.pipelines.map((p) => `  ${path18.relative(ws.root, p)}`).join("\n")}`);
}
function load(ws, args) {
  const file = pickPipeline(ws, args);
  const loaded = loadPipeline(file, {
    workspaceRoot: ws.root,
    config: ws.config,
    parameters: pairs(args.flags.get("param"), "--param"),
    variables: pairs(args.flags.get("var"), "--var")
  });
  printDiagnostics([...ws.config.diagnostics, ...loaded.pipeline.diagnostics], ws.root);
  return loaded;
}
function ask(question, hidden = false) {
  return new Promise((resolve10) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl;
      const write = out._writeToOutput.bind(rl);
      let prompted = false;
      out._writeToOutput = (text2) => {
        if (!prompted) {
          write(text2);
          prompted = true;
        }
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve10(answer);
    });
  });
}
async function approveIsolation(ws, args, risks, fingerprint) {
  const file = path18.join(ws.home, "isolation-approvals.json");
  const key = ws.root.toLowerCase();
  let approvals = {};
  try {
    approvals = JSON.parse(fs15.readFileSync(file, "utf8"));
  } catch {
  }
  if (approvals[key] === fingerprint) return true;
  console.log(paint(33, bold(".azp-local.yml weakens the isolation of this run:")));
  for (const risk of risks) console.log(paint(33, `  - ${risk.message}`));
  console.log(dim("  The file is part of the repository, so anyone who can change the repository can change these settings."));
  if (args.flags.has("allow-unisolated")) {
    console.log(paint(33, "  -> allowed (--allow-unisolated)\n"));
    return true;
  }
  if (!process.stdin.isTTY || args.flags.has("yes")) {
    console.log(paint(31, "  -> not run. Check the settings, then run in a terminal to approve them, or pass --allow-unisolated.\n"));
    return false;
  }
  const answer = (await ask("  Allow? [a]lways for this repository (until these settings change), [o]nce, [N]o: ")).trim().toLowerCase();
  if (answer === "a" || answer === "always") {
    approvals[key] = fingerprint;
    fs15.mkdirSync(path18.dirname(file), { recursive: true });
    fs15.writeFileSync(file, JSON.stringify(approvals, null, 2));
    return true;
  }
  return answer === "o" || answer === "once";
}
function readSecretsFile(file, root) {
  const absolute = path18.resolve(file);
  if (!path18.relative(root, absolute).startsWith("..")) {
    console.error(paint(33, `warning  ${file} is inside the repository. Keep secrets outside it so they are never committed or copied into a job.`));
  }
  const text2 = fs15.readFileSync(absolute, "utf8");
  const out = {};
  for (const line of text2.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][\w.]*)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1].toLowerCase()] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}
function resolveSelection(pipeline2, args, store) {
  const flag = (name) => args.flags.get(name)?.[0];
  if (args.flags.has("rerun-failed") && !flag("step") && !flag("job") && !flag("stage") && !flag("from-stage")) {
    const given = flag("rerun-failed");
    const runId = given && given !== "true" ? given : store.listRuns().find((r) => path18.resolve(r.pipelineFile) === path18.resolve(pipeline2.file))?.runId;
    if (!runId) throw new Error("There is no earlier run of this pipeline to re-run.");
    return { kind: "failed", runId };
  }
  return selectByName(pipeline2, { step: flag("step"), job: flag("job"), stage: flag("stage"), fromStage: flag("from-stage") });
}
async function commandRun(ws, args) {
  const loaded = load(ws, args);
  const { pipeline: pipeline2 } = loaded;
  if (pipeline2.diagnostics.some((d) => d.severity === "error")) {
    console.error("The pipeline has errors; nothing was run.");
    return 1;
  }
  const store = new RunStore(ws.storeDir);
  const selection = resolveSelection(pipeline2, args, store);
  const buildId = store.nextBuildId();
  const buildNumber = formatBuildNumber(pipeline2.name, /* @__PURE__ */ new Date(), buildId, (base) => store.revision(base), loaded.staticVariables);
  const plan = createPlan(pipeline2, selection, { history: store, variables: pairs(args.flags.get("var"), "--var"), buildId, buildNumber });
  const flag = (name) => args.flags.get(name)?.[0];
  const yes = args.flags.has("yes");
  const quiet = args.flags.has("quiet");
  const interactive = !!process.stdin.isTTY && !yes;
  const fileSecrets = flag("secrets") ? readSecretsFile(flag("secrets"), ws.root) : {};
  const engine = new LocalEngine({
    imagesDir: imagesDir(),
    cacheDir: store.cacheDir,
    homeDir: ws.home,
    dockerHost: flag("docker-host"),
    maxParallelJobs: Number(flag("max-parallel") ?? 2),
    keepContainersOnFailure: args.flags.has("keep-on-failure"),
    matchHostedHardware: args.flags.has("match-hosted-hardware"),
    counter: (prefix, seed) => store.counter(prefix, seed)
  });
  const jobName = new Map(pipeline2.stages.flatMap((s) => s.jobs).map((j) => [j.id, j.displayName]));
  const stepName = new Map(pipeline2.stages.flatMap((s) => s.jobs).flatMap((j) => j.steps.map((s) => [`${j.id}/${s.id}`, s.displayName])));
  const width = Math.min(28, Math.max(...[...jobName.values()].map((n) => n.length)));
  const tag = (jobId) => dim(`${(jobName.get(jobId) ?? jobId).padEnd(width).slice(0, width)} |`);
  const view = new RunView(plan.jobs.map((j) => ({ jobId: j.job.id, action: j.action })));
  console.log(bold(`Run ${buildNumber}`) + dim(`  ${describeSelection(pipeline2, selection)}, ${path18.relative(ws.root, pipeline2.file)}`));
  for (const pj of plan.jobs) {
    if (pj.action === "omit") continue;
    console.log(dim(`  ${pj.action === "run" ? "run  " : "reuse"} ${pj.job.displayName}  (${pj.reason})`));
  }
  console.log("");
  const onEvent = (event) => {
    view.apply(event);
    switch (event.type) {
      case "job.started":
        console.log(`${tag(event.jobId)} ${bold("job started")} ${dim(`on ${event.image}`)}`);
        break;
      case "step.started": {
        const name = event.displayName ?? stepName.get(`${event.jobId}/${event.stepId}`) ?? event.stepId;
        stepName.set(`${event.jobId}/${event.stepId}`, name);
        console.log(`${tag(event.jobId)} ${paint(36, `> ${name}`)}`);
        break;
      }
      case "log":
        if (!quiet) {
          const line = /##\[error\]/.test(event.line) ? paint(31, event.line) : /##\[warning\]/.test(event.line) ? paint(33, event.line) : event.line;
          console.log(`${tag(event.jobId)}   ${line}`);
        }
        break;
      case "issue":
        if (quiet) console.log(`${tag(event.jobId)}   ${paint(event.severity === "error" ? 31 : 33, `${event.severity}: ${event.message}`)}`);
        break;
      case "step.finished": {
        const name = stepName.get(`${event.jobId}/${event.stepId}`) ?? event.stepId;
        const step = view.step(event.jobId, event.stepId);
        const took = step.startedAt ? dim(` ${formatDuration(event.at - step.startedAt)}`) : "";
        const note = event.message && event.result !== "succeeded" ? dim(`  ${event.message}`) : "";
        console.log(`${tag(event.jobId)} ${resultMark(event.result)} ${name}${took}${note}`);
        break;
      }
      case "job.finished": {
        const job = view.job(event.jobId);
        const took = job.startedAt ? dim(` in ${formatDuration(event.at - job.startedAt)}`) : "";
        console.log(`${tag(event.jobId)} ${bold(`job ${resultLabel(event.result)}`)}${took}${event.message ? dim(`  ${event.message}`) : ""}`);
        if (event.container) console.log(`${tag(event.jobId)} ${paint(33, `kept for debugging: ${event.container}`)}`);
        break;
      }
      default:
        break;
    }
  };
  const session = startRun({
    engine,
    plan,
    store,
    workspaceRoot: ws.root,
    config: ws.config,
    onEvent,
    hooks: {
      getSecret: async (name, group) => {
        const fromEnv = process.env[`AZP_SECRET_${name.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`];
        if (fromEnv !== void 0) return fromEnv;
        if (fileSecrets[name.toLowerCase()] !== void 0) return fileSecrets[name.toLowerCase()];
        if (!interactive) return void 0;
        const answer = await ask(`Secret '${name}'${group ? ` (variable group ${group})` : ""}, leave empty to skip: `, true);
        return answer === "" ? void 0 : answer;
      },
      confirm: async (message) => {
        if (yes) {
          console.log(paint(33, `${message} -> yes (--yes)`));
          return true;
        }
        if (!interactive) {
          console.log(paint(33, `${message} -> no (not a terminal; pass --yes to proceed)`));
          return false;
        }
        return /^y/i.test(await ask(`${message} [y/N] `));
      },
      approveIsolation: (risks, fingerprint) => approveIsolation(ws, args, risks, fingerprint)
    }
  });
  let interrupted = false;
  const onSigint = () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    console.log(paint(35, "\nCanceling: stopping the running steps, then running steps whose condition allows it. Press Ctrl+C again to quit now."));
    void session.cancel();
  };
  process.on("SIGINT", onSigint);
  const outcome = await session.done;
  process.off("SIGINT", onSigint);
  printSummary(pipeline2, view, outcome, session.runId, store);
  if (outcome.result === "canceled" && outcome.gaps[0] === ISOLATION_DECLINED) return 1;
  switch (outcome.result) {
    case "succeeded":
    case "succeededWithIssues":
    case "skipped":
      return 0;
    case "succeededWithGaps":
      return args.flags.has("allow-gaps") ? 0 : 3;
    case "canceled":
      return 130;
    default:
      return 1;
  }
}
function printSummary(pipeline2, view, outcome, runId, store) {
  const took = view.startedAt && view.finishedAt ? formatDuration(view.finishedAt - view.startedAt) : "";
  console.log(`
${bold("Summary")}  ${runId}${view.buildNumber ? `  build ${view.buildNumber}` : ""}  ${took}`);
  for (const stage of pipeline2.stages) {
    const jobs = stage.jobs.filter((j) => view.jobs.get(j.id)?.state !== "omitted");
    if (jobs.length === 0) continue;
    if (!stage.implicit) console.log(`  ${bold(stage.displayName)}`);
    for (const job of jobs) {
      const state = view.job(job.id);
      const duration = state.startedAt && state.finishedAt ? dim(` ${formatDuration(state.finishedAt - state.startedAt)}`) : "";
      console.log(`    ${resultMark(state.state)} ${job.displayName}${duration}${state.reused ? dim("  (reused)") : ""}${state.message && state.state !== "succeeded" ? dim(`  ${state.message}`) : ""}`);
    }
  }
  for (const { jobId, summary } of view.tests) {
    console.log(`  Tests     ${summary.title}: ${summary.passed}/${summary.total} passed${summary.failed ? paint(31, `, ${summary.failed} failed`) : ""}${summary.skipped ? `, ${summary.skipped} skipped` : ""} ${dim(`(${jobId})`)}`);
  }
  for (const { jobId, summary } of view.coverage) {
    const pct = summary.linesTotal ? (summary.linesCovered / summary.linesTotal * 100).toFixed(1) : "0.0";
    console.log(`  Coverage  ${pct}% of lines (${summary.linesCovered}/${summary.linesTotal}, ${summary.format}) ${dim(`(${jobId})`)}`);
  }
  for (const artifact of view.artifacts) console.log(`  Artifact  ${artifact.name}: ${artifact.files} file(s)  ${dim(artifact.path)}`);
  for (const summary of view.summaries) console.log(`  Summary   ${summary.name}  ${dim(summary.path)}`);
  if (outcome.gaps.length > 0) {
    console.log(paint(33, "\n  Did not run as it would on Azure DevOps:"));
    for (const gap of outcome.gaps) console.log(paint(33, `    - ${gap}`));
  }
  const verdict = `Result: ${resultLabel(outcome.result)}`;
  console.log(`
${outcome.result === "failed" ? paint(31, verdict) : outcome.result === "succeeded" ? paint(32, verdict) : paint(33, verdict)}`);
  if (outcome.result !== "failed") console.log(dim("A local pass means the steps work here. It does not satisfy a branch policy or prove the run passes on Azure DevOps."));
  console.log(dim(`Logs and artifacts: ${store.runDir(runId)}`));
}
async function main(argv) {
  const args = parseArgs(argv);
  if (args.flags.has("help") || args.command === "help") {
    console.log(HELP);
    return 0;
  }
  const ws = openWorkspace(args);
  switch (args.command) {
    case "graph": {
      const loaded = load(ws, args);
      const graph = buildGraph(loaded.pipeline, loaded.staticVariables, ws.config);
      console.log(args.flags.has("json") ? JSON.stringify(graph, null, 2) : renderGraphText(graph));
      return loaded.pipeline.diagnostics.some((d) => d.severity === "error") ? 1 : 0;
    }
    case "expand": {
      const loaded = load(ws, args);
      if (!loaded.expanded) return 1;
      process.stdout.write(toYamlText(loaded.expanded));
      return loaded.pipeline.diagnostics.some((d) => d.severity === "error") ? 1 : 0;
    }
    case "run":
      return commandRun(ws, args);
    case "doctor": {
      const files = args.positional[0] ? [path18.resolve(ws.root, args.positional[0])] : discoverPipelines(ws.root, ws.config).pipelines;
      console.log(`Workspace ${ws.root}`);
      console.log(files.length ? `Pipelines: ${files.map((f) => path18.relative(ws.root, f)).join(", ")}
` : "No pipeline files were found.\n");
      const pipelines = files.map((file) => loadPipeline(file, { workspaceRoot: ws.root, config: ws.config }).pipeline);
      const findings = [
        ...await checkDocker(pipelines, ws.config, { dockerHost: args.flags.get("docker-host")?.[0], storeDir: ws.storeDir }),
        ...analysePipelines(pipelines, ws.config)
      ];
      const store = new RunStore(ws.storeDir);
      findings.push({ level: "info", area: "Disk", message: `Run store uses ${(store.sizeBytes() / 1024 ** 2).toFixed(1)} MB for ${store.listRuns().length} run(s)` });
      console.log(renderFindings(findings));
      return findings.some((f) => f.level === "error") ? 1 : 0;
    }
    case "runs": {
      const store = new RunStore(ws.storeDir);
      const runs = store.listRuns();
      if (runs.length === 0) console.log("No local runs yet.");
      for (const run of runs) {
        const took = run.finishedAt ? formatDuration(run.finishedAt - run.startedAt) : "unfinished";
        console.log(`${run.runId}  ${resultMark(run.result ?? "")} ${new Date(run.startedAt).toISOString().replace("T", " ").slice(0, 19)}  ${took.padEnd(8)} ${path18.relative(ws.root, run.pipelineFile)}  ${dim(JSON.stringify(run.selection))}`);
      }
      return 0;
    }
    default:
      console.error(`Unknown command '${args.command}'.
`);
      console.log(HELP);
      return 2;
  }
}
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(paint(31, `error  ${err.message}`));
    process.exitCode = 1;
  }
);
//# sourceMappingURL=azp-local.cjs.map
