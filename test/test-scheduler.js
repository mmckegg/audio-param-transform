var Scheduler = require('../scheduler')

// fake audio context
var startTime = Date.now()
var audioContext = {
  sampleRate: 48000, 
  get currentTime() {
    return (Date.now() - startTime)/1000
  }
}


var scheduler = Scheduler(audioContext, 4096, function(from, to){
  console.log(audioContext.currentTime, 'from', from.toFixed(2), 'to', to.toFixed(2), (to-from).toFixed(2))
})

scheduler.scheduleRange(1,2)
scheduler.scheduleRange(3,4)
scheduler.scheduleRange(3,5)
scheduler.scheduleRange(4,6)


setTimeout(function(){
  scheduler.scheduleRange(6,7)
}, 3000)

setTimeout(function(){
  scheduler.scheduleRange(7.5)
}, 7100)

setTimeout(function(){
  scheduler.scheduleRange(8,9)
}, 8000)