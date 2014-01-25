'use strict';

function Bread(fn, fork) {
  this.fn = fn;
  this.zone = fork || new Zone();
  this.slices = [];
  this.notes = [];

  this.onZoneEnter = this._enter.bind(this);
  this.onZoneLeave = this._exit.bind(this);

  this.totalTime = 0;
  this.lastTime = 0;
}

Bread.ptorotype = {
  constructor: Bread,
  _exit: function () {
    this.totalTime += (Bread._performance() - this.lastTime);
  },
  _enter: function () {
    this.lastTime = Bread._performance();
  },
  start: function() {
    this.lastTime = Bread._performance();
    this.zone.fork(this).run(this.fn);
    return this;
  },
  subset: function(forkFn) {
    var sub = new Bread(forkFn, this.zone.fork()); //is this necessary?
    this.slices.push(sub);
    return sub.start();
  }
};

Bread.note = function (note){
  ///this might deserve a more proper timestamping of the note
  ///use .mark() and .measure() ?
  ///create a uniqe id or something and use mark with the guid
  ///then use measure between the ids and match up the notes
  /// note = { id: "", note: note};

  window.bread.notes.push({
    id: "",
    note: note
  });
};

Bread.run = function (fn) {
  window.bread = new Bread(fn);
  return window.bread.start();
};

Bread.time = function () {
  var tempTime = 0;
  window.bread.slices.forEach(function(slice){
    tempTime += slice.totalTime;
  });
  return tempTime;//window.bread.totalTime;
};

Bread.slice = function (fn, note) {
  if(note)
    Bread.note(note);
  return window.bread.subset(fn);
};

Bread._mark = window.performance.mark;
Bread._measure = window.performance.measure;
Bread._performance = (window.performance) ?
  (performance.now || performance.webkitNow || performance.msNow
    || performance.mozNow || Date.now
    || function () { return +(new Date()); } )
  : Date.now || function () { return +(new Date()); };


function Zone(parentZone, data) {
  var zone = (arguments.length) ? Object.create(parentZone) : this;

  zone.parent = parentZone;

  Object.keys(data || {}).forEach(function(property) {
    zone[property] = data[property];
  });

  return zone;
}






///Zone.js from https://github.com/angular/zone.js.git
Zone.prototype = {
  constructor: Zone,

  fork: function (locals) {
    return new Zone(this, locals);
  },

  bind: function (fn) {
    var zone = this.fork();
    return function zoneBoundFn() {
      var result = zone.run(fn, this, arguments);
      return result;
    };
  },

  run: function run (fn, applyTo, applyWith) {
    applyWith = applyWith || [];

    var oldZone = window.zone,
      result;

    window.zone = this;

    try {
      this.onZoneEnter();
      result = fn.apply(applyTo, applyWith);
    } catch (e) {
      if (zone.onError) {
        zone.onError(e);
      }
    } finally {
      this.onZoneLeave();
      window.zone = oldZone;
    }
    return result;
  },

  onZoneEnter: function () {},
  onZoneLeave: function () {}
};

Zone.patchFn = function (obj, fnNames) {
  fnNames.forEach(function (name) {
    var delegate = obj[name];
    zone[name] = function () {
      arguments[0] = zone.bind(arguments[0]);
      return delegate.apply(obj, arguments);
    };

    obj[name] = function marker () {
      return zone[name].apply(this, arguments);
    };
  });
};

Zone.patchableFn = function (obj, fnNames) {
  fnNames.forEach(function (name) {
    var delegate = obj[name];
    zone[name] = function () {
      return delegate.apply(obj, arguments);
    };

    obj[name] = function () {
      return zone[name].apply(this, arguments);
    };
  });
};

Zone.patchProperty = function (obj, prop) {
  var desc = Object.getOwnPropertyDescriptor(obj, prop) || {
    enumerable: true,
    configurable: true
  };

  // A property descriptor cannot have getter/setter and be writable
  // deleting the writable and value properties avoids this error:
  //
  // TypeError: property descriptors must not specify a value or be
  // writable when a getter or setter has been specified
  delete desc.writable;
  delete desc.value;

  // substr(2) cuz 'onclick' -> 'click', etc
  var eventName = prop.substr(2);
  var _prop = '_' + prop;

  desc.set = function (fn) {
    if (this[_prop]) {
      this.removeEventListener(eventName, this[_prop]);
    }

    this[_prop] = fn;

    this.addEventListener(eventName, fn, false);
  };

  desc.get = function () {
    return this[_prop];
  };

  Object.defineProperty(obj, prop, desc);
};

Zone.patchProperties = function (obj) {
  Object.keys(obj).
    filter(function (propertyName) {
      return propertyName.substr(0,2) === 'on';
    }).
    forEach(function (eventName) {
      Zone.patchProperty(obj, eventName);
    });
};

Zone.patchEventTarget = function (obj) {
  var addDelegate = obj.addEventListener;
  obj.addEventListener = function (eventName, fn) {
    arguments[1] = fn._bound = zone.bind(fn);
    return addDelegate.apply(this, arguments);
  };

  var removeDelegate = obj.removeEventListener;
  obj.removeEventListener = function (eventName, fn) {
    arguments[1] = arguments[1]._bound || arguments[1];
    return removeDelegate.apply(this, arguments);
  };
};

Zone.patch = function patch () {
  Zone.patchFn(window, ['setTimeout', 'setInterval']);
  Zone.patchableFn(window, ['alert', 'prompt']);

  // patched properties depend on addEventListener, so this comes first
  Zone.patchEventTarget(EventTarget.prototype);

  Zone.patchProperties(HTMLElement.prototype);
  Zone.patchProperties(XMLHttpRequest.prototype);
};

Zone.init = function init () {
  window.zone = new Zone();
  Zone.patch();
};


Zone.init();