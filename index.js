var mergeTransforms = require('./merge_transforms')

module.exports = extend

function extend(param, audioContext){
  if (!param.transform){
    param._transforms = []
    param._doSchedule = doSchedule.bind(param)
    param._pendingTransforms = 0
    param.context = audioContext
    param.transform = transform
  }
  return param
}

function transform(operation, defaultValue){ // bound to AudioParam
  var state = {operation: operation, events: [], cleanTo: 0, value: defaultValue || 0}

  if (!operation){
    state.value = this.value
  }

  var paramTransform = Object.create(proto, {
    value: { 
      get: function(){
        return paramTransform.getValueAt(null)
      },
      set: function(value){
        paramTransform.setValueAtTime(value, 0)
      }
    }
  })

  paramTransform.param = this
  paramTransform._state = state 

  this._transforms.push(state)
  return paramTransform
}

function doSchedule(){ // bound to AudioParam
  if (this._pendingTransforms > 0){

    var transforms = []
    var from = Infinity
    var to = 0
    var step = 0

    // set from / to
    for (var i=0;i<this._transforms.length;i++){
      var state = this._transforms[i]
      //cleanup(this, state)
      for (var x=0;x<state.events.length;x++){
        var event = state.events[x]
        if (from > event.from && !event.scheduled){
          from = event.from
        }
        if (to < event.to){
          to = event.to
        }
        if (event.step && (!step || step > event.step)){
          step = event.step
        }
      }
    }

    if (from > 0 && from < Infinity){
      var result = mergeTransforms(this._transforms, from, to, step)

      this.cancelScheduledValues(from)
      if (result.length === 1){
        this.setValueAtTime(result[0], from)
      } else if (result.length > 1) {
        this.setValueCurveAtTime(result, from, to-from)
      }
    }

    this._pendingTransforms = 0
  }
}

var proto = {
  setValueAtTime: function(value, at){
    schedule(this, { 
      curve: new Float32Array([value]),
      from: at, 
      to: at,
      value: value
    })
  },
  linearRampToValueAtTime: function(value, endTime){
    var startTime = this.param.context.currentTime + 0.00001
    endTime = Math.max(endTime, startTime)

    var startValue = this.getValueAt(startTime)
    var duration = endTime - startTime
    var steps =  this.param.context.sampleRate / duration

    schedule(this, {
      curve: getCurve(startValue, value, steps, curves.linear), 
      from: startTime,
      to: endTime, 
      value: value
    })
  },
  exponentialRampToValueAtTime: function(value, endTime){
    var startTime = this.param.context.currentTime + 0.00001
    endTime = Math.max(endTime, startTime)

    var startValue = this.getValueAt(startTime)
    var duration = endTime - startTime
    var steps =  this.param.context.sampleRate / duration

    schedule(this, {
      curve: getCurve(startValue, value, steps, curves.exp), 
      from: startTime,
      to: endTime, 
      value: value
    })
  },
  setValueCurveAtTime: function(curve, at, duration){
    schedule(this, {
      curve: curve, 
      from: at,
      to: at + duration, 
      value: curve[curve.length-1]
    })
  },
  cancelScheduledValues: function(startTime){
    schedule(this, {cancel: true, at: startTime || this.param.context.currentTime})
  },
  getValueAt: function(time){
    var state = this._state
    if (!time || state.cleanTo > time){
      return state.value
    } else {
      var lastValue = state.value
      var highestTime = 0
      for (var i=state.events.length-1;i>=0;i--){
        var event = state.events[i]
        if (event.to > time && event.from < time && event.step ){
          var offset = Math.floor((time - event.from) / event.step)
          lastValue = event.curve[offset]
          highestTime = time
        }
        if (event.to < time && !event.cancel && event.to > highestTime){
          highestTime = event.to
          lastValue = event.value
        }
      }
      return lastValue
    }
  }
}

////////////////UNBOUND//////////////////////////////////////////////////

function cleanup(param, state){
  var currentTime = param.context.currentTime
  for (var i=state.events.length-1;i>=0;i--){
    var event = state.events[i]
    if (event.to < currentTime || event.at < currentTime){
      if (event.to > state.cleanTo){
        state.cleanTo = event.to
        if (!event.cancel){
          state.value = event.value
        }
      }
      // remove the event, it has already taken place
      state.events.splice(i, 1)
    }
  }
}

function schedule(transform, event){
  //TODO: handle cancel clean up
  var state = transform._state

  if (event.cancel){

    // remove any scheduled events and replace with single value
    for (var i=state.events.length-1;i>=0;i--){
      var e = state.events[i]
      if (e.from > event.at){
        state.events.splice(i, 1)
      } else if (e.to > event.at){
        e.to = event.at
      }
    }

  } else {

    if (!event.from){
      event.from = transform.param.context.currentTime+0.00000001
    }

    if (!event.to){
      event.to = event.from
    }


    var duration = event.to - event.from

    if (event.curve){
      event.step = duration / event.curve.length
    }
  }

  transform._state.events.push(event)
  transform.param._pendingTransforms += 1

  if (event.from <= transform.param.context.currentTime + 0.001){
    transform.param._doSchedule()
  } else {
    // attempt to batch the transform
    process.nextTick(transform.param._doSchedule)
  }
}

function getCurve(startValue, targetValue, steps, curve){
  var result = new Float32Array(steps)
  var step = 1 / steps
  var range = targetValue - startValue

  for (var i=0;i<steps;i++){
    var offset = curve(step * i) * range
    result[i] = startValue + offset
  }

  return result
}

var curves = {
  exp: function(value){
    return value * value
  },
  linear: function(value){
    return value
  }
}