/**
 * TransformAudioParam (TAP) constructor
 * @param {AudioContext}  audioContext
 * @param {???}           defaultValue
 * @param {Function}      callback
 */
function TAP( audioContext, defaultValue, callback ) {
  
  if( !(this instanceof TAP) )
    return new TAP( audioContext, defaultValue, callback )
  
  this.context = audioContext
  this._callback = callback

  this._events = []
  this._sampleRate = audioContext.sampleRate
  this._events.truncateFrom = TAP.truncateFrom
  this._events.truncateTo = TAP.truncateTo
  this.defaultValue = defaultValue
  this._lastValue = defaultValue
  
}

/**
 * Interpolation functions
 * @type {Object}
 */
TAP.interpolation = {
  
  linearRamp: function( start, target, pos ) {
    var range = target.value - start
    return start + range * pos
  },
  
  exponentialRamp: function( start, target, pos ) {
    var range = target.value - start
    return start + range * Math.pow( pos, 2 )
  },
  
  valueCurve: function( start, target, pos ) {
    var index = ( pos * target.value.length ) | 0
        index = Math.min( index, target.value.length - 1 )
    return target.value[ index ]
  },
  
  target: function( start, target, pos ) {
    var range = target.value - start
    return start + range * TAP.expFalloff( pos, target.timeConstant )
  },
  
}

/**
 * Interpolation selector
 * @param  {Number} start
 * @param  {Object} target
 * @param  {Number} pos
 * @return {Number}
 */
TAP.interpolate = function( start, target, pos ) {
  return TAP.interpolation[ target.type ]( start, target, pos )
}

TAP.truncateFrom = function( time ) {
  for (var i=0; i<this.length; i++){
    if (this[i].at >= time){
      this.splice(i, this.length-i)
      return true
    }
  }
}

TAP.truncateTo = function( time ) {
  for (var i=this.length-1; i>=0; i--){
    if (this[i].at <= time){
      this.splice(0, i+1)
      return true
    }
  }
}

TAP.expFalloff = function( pos, t ) {
  var factor = 1000
  return (
    Math.log( 1 + pos * ( t * factor ) ) /
      Math.log( 1 + ( t * factor ) )
  )
}

TAP.falloffTime = function( t ) {
  return t * 8
}

/**
 * TAP prototype
 * @type {Object}
 */
TAP.prototype = {
  
  constructor: TAP,
  
  get value() {
    this.getValueAt( this.context.currentTime )
  },
  
  set value( value ) {
    this.setValueAtTime( value, this.context.currentTime )
  },
  
  setValueAtTime: function(value, at){
    this.addEvent({
      at: at,
      value: value,
      type: 'set'
    })
  },
  
  linearRampToValueAtTime: function(value, endTime){
    this.addEvent({
      from: this.context.currentTime,
      at: endTime,
      value: value,
      type: 'linearRamp'
    })
  },
  
  exponentialRampToValueAtTime: function(value, endTime){
    this.addEvent({
      from: this.context.currentTime,
      at: endTime,
      value: value,
      type: 'exponentialRamp'
    })
  },
  
  setValueCurveAtTime: function(curve, at, duration){
    this.addEvent({
      from: at,
      at: at+duration,
      value: curve,
      type: 'valueCurve'
    })
  },
  
  setTargetAtTime: function(targetValue, at, timeConstant){
    this.addEvent({
      timeConstant: timeConstant,
      at: at + TAP.falloffTime(timeConstant), 
      from: at,
      value: targetValue,
      type: 'target'
    })
  },
  
  cancelScheduledValues: function(startTime){

    this._events.truncateFrom(startTime)
    if (typeof this._callback === 'function'){
      this._callback(startTime)
    }
    // truncate scheduled curves
    // truncate targets
  },
  
  popEventsTo: function(toTime){
    this._lastValue = this.getValueAt(toTime)
    this._events.truncateTo(toTime)
  },
  
  addEvent: function(event){
    for (var i=0;i<this._events.length;i++){
      var curr = this._events[i]
      if (curr.at === event.at){
        this._events[i] = event
        break
      } else if (event.at < curr.at){
        this._events.splice(i, 0, event)
        break
      }
    }

    if (i === this._events.length){
      this._events.push(event)
    }

    if (typeof this._callback === 'function'){
      this.popEventsTo(this.context.currentTime)
      this._callback(event.from || event.at, event.at)
    }
  },

  generateCurveRange: function(fromTime, toTime){
    var duration = toTime - fromTime
    var steps = Math.max(1, Math.floor(duration * this._sampleRate))
    var curve = new Float32Array(steps)

    for (var i=0;i<steps;i++){
      var time = fromTime + duration * (i / steps)
      curve[i] = this.getValueAt(time)
    }
    return curve
  },

  getValueAt: function(time){
    var lastValue = this._lastValue

    for (var i=0; i<this._events.length; i++){
      var target = this._events[i]

      if (target.from && target.from <= time && target.at >= time){
        var duration = target.at - target.from
        var pos = (time - target.from) / duration
        return TAP.interpolate(lastValue||0, target, pos)
      } else if (target.at <= time){
        if (target.value instanceof Float32Array){
          lastValue = target.value[target.value.length-1]
        } else {
          lastValue = target.value
        }
      }

      if (this.from && this.from > time){
        break
      }
    }

    return lastValue
  },
  
}

// Exports
module.exports = TAP
