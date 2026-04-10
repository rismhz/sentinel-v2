self.addEventListener('install',()=>self.skipWaiting())
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()))
self.addEventListener('push',e=>{
  let d={title:'SENTINEL ALERT',body:'New intelligence event',icon:'/favicon.ico',tag:'sentinel',requireInteraction:true}
  try{if(e.data)Object.assign(d,e.data.json())}catch{}
  e.waitUntil(self.registration.showNotification(d.title,{
    body:d.body,icon:d.icon,badge:d.icon,tag:d.tag,
    requireInteraction:d.requireInteraction,
    vibrate:[300,100,300,100,300],data:d
  }))
})
self.addEventListener('notificationclick',e=>{
  e.notification.close()
  e.waitUntil(clients.matchAll({type:'window'}).then(wcs=>{
    const w=wcs.find(c=>c.focus)
    if(w)return w.focus()
    if(clients.openWindow)return clients.openWindow('/')
  }))
})
