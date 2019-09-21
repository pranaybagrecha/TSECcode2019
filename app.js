const express = require('express')
const port =  process.env.PORT || 3000
const app = express()
app.use('/',express.static('public'));
const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`)) || require('http').Server(app)
const io = require('socket.io')(server)
const fetch = require('node-fetch')
// Firebase App (the core Firebase SDK) is always required and
// must be listed before other Firebase SDKs
var firebase = require("firebase/app");

// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/firestore");


 // Your web app's Firebase configuration
 var firebaseConfig = {
    apiKey: "AIzaSyAHPRnFGoMczU9KKgXTqErbdRXiaR2HtdM",
    authDomain: "tsec-7cc1d.firebaseapp.com",
    databaseURL: "https://tsec-7cc1d.firebaseio.com",
    projectId: "tsec-7cc1d",
    storageBucket: "",
    messagingSenderId: "854249222803",
    appId: "1:854249222803:web:c0c2550a56587c44f01366"
  };
  // Initialize Firebase
firebase.initializeApp(firebaseConfig);

let getFireStationRef = firebase.firestore().collection('cities');

getFireStationRef.where('processing' , '==' , false).onSnapshot(querySnapshot => {
  console.log(`Received query snapshot of size ${querySnapshot.size}`);
  Promise.all(querySnapshot.docChanges().map(change =>{
      if (change.type === 'added') {
      let data =  change.doc.data()
      fetch('https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=AIzaSyBn8SRZwqh0ZgYzIYjnHK1D7CL_Dhy9eqs&location='+data.latitude+','+data.longitude+'&radius=160000&sensor=false&types=fire+station&keyword=fire+station')
      .then(res => res.json())
      .then(json => {
        console.log(json.results.length)
        let nearestFS =json.results[0]
        let ref  = firebase.firestore().collection('cities').where('latitude', '==' , data.latitude).where('longitude','==', data.longitude).get()
        .then(snapshot =>{
          snapshot.forEach(doc=>{
                firebase.firestore().collection('cities').doc(doc.id).set({Flatitude: nearestFS.geometry.location.lat, Flongitude: nearestFS.geometry.location.lng },{merge:true});
                console.log(doc.id)
          });
        })
      
      }).catch(error => {
          console.log(error)
         
      });
    }

}));
});
io.on('connection', function (socket) {
  console.log('new connection '+ socket.id)
  senduserurls(socket)
  socket.on('allMapdatareq',data=>{
      getAllUserCordinates(socket);
  })
});


  //helper functions
  function getAllUserCordinates(socket){
    firebase.firestore().collection('cities').onSnapshot(doc =>{
      doc.forEach(eDoc => {
        
          socket.emit('leMapData',{doc:eDoc.data()})
        
      });
    });

  }
  function senduserurls(socket){
    firebase.firestore().collection('post_urls').onSnapshot(doc =>{
      doc.docChanges().forEach(change => {
        if (change.type === 'added') {
          socket.emit('newUrl',{urls:change.doc.data()})
        }
      });
    });
  }
function pushUrlsToFirebase(urls){
    let ref;
    urls.forEach(element => {
        ref  = firebase.firestore().collection('post_urls').doc(element.id)
        .set({time:element.timestamp, url: element.post_url},{merge:true});
    });
    
}

function fetchNearestFireStation(data){
  fetch('https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=AIzaSyBn8SRZwqh0ZgYzIYjnHK1D7CL_Dhy9eqs&location='+data.latitude+','+data.longitude+'&radius=160000&sensor=false&types=fire+station&keyword=fire+station')
  .then(res => res.json())
  .then(json => {
    console.log(json.results.length)
    if(json.results.length < 1){
      return
    }
    let nearestFS =json.results[0]
    let ref  = firebase.firestore().collection('cities').where('latitude', '==' , data.latitude).where('longitude','==', data.longitude).get()
    .then(snapshot =>{
      snapshot.forEach(doc=>{
            firebase.firestore().collection('cities').doc(doc.id).set({Flatitude: nearestFS.geometry.location.lat, Flongitude: nearestFS.geometry.location.lng },{merge:true});

            console.log(doc.id)
      });
    })
  
  }).catch(error => {
      console.log(error)
     
  });
}
function fetchData(){
    var post_urls = [];
    fetch('https://thawing-bayou-32780.herokuapp.com/firestationtsec')
    .then(res => res.json())
    .then(json => {
          pushUrlsToFirebase(json)
    }).catch(error => {
        post_urls = []
       
    });

  }
setInterval(() => {
  fetchData()    
}, 1000*30);