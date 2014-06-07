module.exports = function Scheduler(audioContext, bufferSize, cb){
  var instance = Object.create(proto)
  instance.context = audioContext
  instance._doSchedule = doSchedule.bind(instance)
  instance._callback = cb
  instance._scheduledTo = audioContext.currentTime
  instance._targetTime = instance._scheduledTo
  instance._bufferSize = bufferSize
  instance._interval = bufferSize / instance.context.sampleRate
  instance._timer = null
  return instance
}

var proto = {
  scheduleRange: function(from, to){

    var currentTime = this.context.currentTime

    to = to || from
    from = Math.max(from, currentTime)
    to = Math.max(from, to)

    this._targetTime = Math.max(this._targetTime, to)

    var length = (this._targetTime - currentTime)


    if (!this._timer || (from < this._fromTime)){
      
      if (this._timer){
        clearInterval(this._timer)
        this._timer = null
      }

      this._fromTime = Math.max(from, currentTime)
      this._doSchedule()
      if (length > this._interval){
        this._timer = setInterval(this._doSchedule, this._interval * 500)
      }
    }

  }
}

function doSchedule(){

  var currentTime = this.context.currentTime
  var preTime = (currentTime + this._interval)


  if (this._fromTime <= preTime){

    var toTime = Math.min(this._fromTime + this._interval, this._targetTime)

    if (typeof this._callback === 'function'){
      this._callback(this._fromTime, toTime)
    }


    if (toTime >= this._targetTime){
      // all done!
      clearInterval(this._timer)
      this._timer = null
    } else {
      // ready for next
      this._fromTime = toTime
    }

  } else {
    // skip this cycle
  }

}