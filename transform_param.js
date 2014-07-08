module.exports = function TransformAudioParam(audioContext, defaultValue, cb){
  var instance = Object.create(proto, properties)
  instance.context = audioContext
  instance._callback = cb

  instance._events = []
  instance._events.truncateFrom = truncateFrom
  instance._events.truncateTo = truncateTo
  instance.defaultValue = defaultValue
  instance._lastValue = defaultValue

  return instance
}

var properties = {
  value: {
    get: function(){
      this.getValueAt(this.context.currentTime)
    },
    set: function(value){
      this.setValueAtTime(value, this.context.currentTime)
    }
  }
}

var proto = {
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
      at: at + falloffTime(timeConstant), 
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
    var steps = Math.max(1, Math.floor(duration * this.context.sampleRate))
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
        return interpolate(lastValue||0, target, pos)
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
  }
}

function interpolate(start, target, pos){
  var range = target.value - start

  if (target.type === 'linearRamp'){
    return start + range * pos
  } else if (target.type === 'exponentialRamp'){
    return start + range * Math.pow(pos, 2)
  } else if (target.type === 'valueCurve'){
    return target.value[Math.min(Math.floor(pos * target.value.length), target.value.length-1)]
  } else if (target.type === 'target'){
    return start + range * expFalloff(pos, target.timeConstant)
  }
}

function truncateFrom(time){
  for (var i=0; i<this.length; i++){
    if (this[i].at >= time){
      this.splice(i, this.length-i)
      return true
    }
  }
}

function truncateTo(time){
  for (var i=this.length-1; i>=0; i--){
    if (this[i].at <= time){
      this.splice(0, i+1)
      return true
    }
  }
}

// this stuff needs improving to match the API better
function expFalloff(pos, t){
  var multiplier = 1000
  return Math.log(1+pos*(t*multiplier)) / Math.log(1+(t*multiplier))
}
function falloffTime(t){
  return t*8
}

