var Scheduler = require('./scheduler')
var TransformParam = require('./transform_param')

module.exports = function extend(param, audioContext){
  if (!param.transform){
    param._transforms = []
    param.context = audioContext
    param._sampleRate = audioContext.sampleRate
    param.transform = transform
    param.clearTransforms = clearTransforms
    param.scheduler = Scheduler(param.context, Math.pow(2,10), doSchedule.bind(param))
    param._transformCallback = param.scheduler.scheduleRange.bind(param.scheduler)
  }
  return param
}

function clearTransforms(){
  var param = this
  this._transforms = []
}

function transform(operation, defaultValue){ // bound to AudioParam
  var param = this

  if (typeof defaultValue != 'number' && typeof operation === 'number'){
    defaultValue = operation
    operation = null
  }

  if (typeof defaultValue != 'number' && !operation){
    defaultValue = param.defaultValue
  }

  var transformParam = new TransformParam(this.context, defaultValue, param._transformCallback)
  transformParam.operation = operation
  transformParam._transforms = []

  transformParam.transform = transform
  transformParam.clearTransforms = clearTransforms
  transformParam._transformCallback = param._transformCallback

  param._transforms.push(transformParam)
  return transformParam
}

function doSchedule(from, to){
  var param = this
  var duration = to - from
  var steps = Math.max(1, Math.floor(duration * param._sampleRate))
  var defaultValue = param.defaultValue

  var curve = new Float32Array(steps)

  var curves = []
  var transforms = getTransforms(param)

  for (var i=0;i<transforms.length;i++){
    var transform = transforms[i]
    curves[i] = transform.generateCurveRange(from, to)
  }

  for (var i=0;i<steps;i++){
    var value = defaultValue
    for (var x=0;x<transforms.length;x++){
      var transform = transforms[x]
      if (transform.operation){
        value = transform.operation(value, curves[x][i])
      } else {
        value = curves[x][i]
      }
    }
    curve[i] = value
  }

  if (steps === 1){
    param.setValueAtTime(curve[0], from)
  } else if (steps > 1) {
    param.setValueCurveAtTime(curve, from, duration)
  }
}

function getTransforms(param, target){
  target = target || []

  if (Array.isArray(param._transforms)){
    for (var i=0;i<param._transforms.length;i++){
      target.push(param._transforms[i])
      getTransforms(param._transforms[i], target)
    }
  }

  return target
}