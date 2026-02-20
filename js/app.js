const BASE="https://6997729fd66520f95f14f6ab.mockapi.io/api/v1";
const CARS=`${BASE}/cars`;
const EVENTS=`${BASE}/events`;

let globalChart;
let carCharts={};
let carsCache=[];

setInterval(loadAll,2000);
loadAll();

async function loadAll(){
    await loadCars();
    await loadEvents();
}

// ================= ADMIN + CONTROL + MONITOREO =================
async function loadCars(){
try{

const res=await fetch(CARS);
const cars=await res.json();

carsCache=cars;

const table=document.getElementById("carTable");
const control=document.getElementById("controlContainer");
const monitorContainer=document.getElementById("monitorCharts");

table.innerHTML="";
control.innerHTML="";
if(monitorContainer) monitorContainer.innerHTML="";

cars.forEach(car=>{

// ===== ADMIN =====
table.innerHTML+=`
<tr>
<td>${car.id}</td>
<td>${car.brand}</td>
<td>${car.model}</td>
<td>${car.year}</td>
<td>${car.plates}</td>
<td>
<button class="btn btn-warning btn-sm" onclick="editCar('${car.id}')">Editar</button>
<button class="btn btn-danger btn-sm" onclick="deleteCar('${car.id}')">Eliminar</button>
</td>
<td>
<button class="btn btn-danger btn-sm" onclick="simulateIncident('${car.id}')">
🚨 Simular
</button>
</td>
</tr>
`;

// ===== CONTROL =====
control.innerHTML+=`
<div class="col-md-4 mb-4">
<div class="card p-3 text-center">

<h5>${car.brand} ${car.model}</h5>

<button class="btn btn-success mb-2 w-100" onclick="toggleEngine('${car.id}')">
${car.engineOn ? "Apagar Motor" : "Encender Motor"}
</button>

${car.engineOn ? `
<div class="mt-2 text-info small">
📍 ${car.latitude || "Generando..."} , ${car.longitude || ""}
</div>
` : ""}

<button class="btn btn-info mb-2 w-100" onclick="toggleCamera('${car.id}')">
${car.cameraActive ? "Cerrar Cámaras" : "Acceder Cámaras"}
</button>

${car.cameraActive ? `
<div class="mt-2">

<button class="btn btn-danger mb-2 w-100"
onclick="toggleRecording('${car.id}')">
${car.recording ? "🔴 Detener Grabación" : "🎥 Comenzar a Grabar"}
</button>

<button class="btn btn-secondary w-100"
onclick="takePhoto('${car.id}')">
📸 Tomar Foto
</button>

</div>
` : ""}

${car.theftType ? `
<div class="alert alert-danger mt-2">
🚨 INCIDENTE: ${car.theftType}
<br>
📍 ${car.latitude}, ${car.longitude}
</div>

<button class="btn btn-warning mb-2 w-100"
onclick="openGoogleMaps('${car.latitude}','${car.longitude}')">
📍 Ver en Google Maps
</button>

<button class="btn btn-danger w-100"
onclick="callPolice('${car.id}')">
🚔 Llamar a la Policía
</button>
` : ""}

</div>
</div>
`;

// ===== MONITOREO =====
if(monitorContainer){
monitorContainer.innerHTML+=`
<div class="col-md-4 text-center mb-4">
<h6 class="text-info">${car.brand} ${car.model}</h6>
<canvas id="chart-${car.id}" class="monitor-chart"></canvas>
</div>
`;
}

});

updateGlobalChart(cars);
drawIndividualCharts(cars);

}catch(error){
console.error("Error cargando autos:",error);
}
}

// ================= CRUD =================
async function saveCar(){

const id=document.getElementById("carId").value;

const car={
brand:document.getElementById("brand").value,
model:document.getElementById("model").value,
year:document.getElementById("year").value,
plates:document.getElementById("plates").value,
engineOn:false,
cameraActive:false,
recording:false,
theftType:"",
latitude:"",
longitude:"",
lastUpdate:new Date().toISOString()
};

if(id){
await fetch(`${CARS}/${id}`,{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});
}else{
await fetch(CARS,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});
}

clearForm();
loadCars();
}

async function editCar(id){
const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

document.getElementById("carId").value=car.id;
document.getElementById("brand").value=car.brand;
document.getElementById("model").value=car.model;
document.getElementById("year").value=car.year;
document.getElementById("plates").value=car.plates;
}

async function deleteCar(id){
await fetch(`${CARS}/${id}`,{method:"DELETE"});
loadCars();
}

function clearForm(){
document.getElementById("carId").value="";
document.getElementById("brand").value="";
document.getElementById("model").value="";
document.getElementById("year").value="";
document.getElementById("plates").value="";
}

// ================= MOTOR =================
async function toggleEngine(id){

const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

car.engineOn=!car.engineOn;

if(car.engineOn){
    car.latitude=(Math.random()*(32-14)+14).toFixed(6);
    car.longitude=(Math.random()*(-86+118)-118).toFixed(6);
    await logEvent(car,`Motor Encendido - Ubicación (${car.latitude}, ${car.longitude})`);
}else{
    await logEvent(car,"Motor Apagado");
}

car.lastUpdate=new Date().toISOString();

await fetch(`${CARS}/${id}`,{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});
}

// ================= CAMARA =================
async function toggleCamera(id){

const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

car.cameraActive=!car.cameraActive;

if(!car.cameraActive){
    car.recording=false;
}

car.lastUpdate=new Date().toISOString();

await fetch(`${CARS}/${id}`,{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});

await logEvent(car,car.cameraActive?"Cámara Activada":"Cámara Desactivada");
}

// ================= GRABACION =================
async function toggleRecording(id){

const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

car.recording=!car.recording;
car.lastUpdate=new Date().toISOString();

await fetch(`${CARS}/${id}`,{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});

await logEvent(car,car.recording?"Grabación Iniciada":"Grabación Detenida");
}

// ================= FOTO =================
async function takePhoto(id){

const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

await logEvent(car,"Foto Capturada 📸");
alert("📸 Foto capturada correctamente");
}

// ================= SIMULACION =================
async function simulateIncident(id){

const incidents=["Robo de Vehículo","Cristales Rotos","Robo de Pieza"];
const random=incidents[Math.floor(Math.random()*incidents.length)];

const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

const lat=(Math.random()*(32-14)+14).toFixed(6);
const lng=(Math.random()*(-86+118)-118).toFixed(6);

car.theftType=random;
car.latitude=lat;
car.longitude=lng;
car.lastUpdate=new Date().toISOString();

await fetch(`${CARS}/${id}`,{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});

await logEvent(car,`${random} en (${lat}, ${lng})`);
}

// ================= POLICIA =================
async function callPolice(id){

const res=await fetch(`${CARS}/${id}`);
const car=await res.json();

await logEvent(car,`Policía Notificada - (${car.latitude}, ${car.longitude})`);

car.theftType="";
car.latitude="";
car.longitude="";
car.lastUpdate=new Date().toISOString();

await fetch(`${CARS}/${id}`,{
method:"PUT",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(car)
});
}

// ================= GOOGLE MAPS =================
function openGoogleMaps(lat,lng){
const url=`https://www.google.com/maps?q=${lat},${lng}`;
window.open(url,'_blank');
}

// ================= EVENTOS =================
async function loadEvents(){

const res=await fetch(EVENTS);
let events=await res.json();

events=events.slice(-10).reverse();

const table=document.getElementById("eventTable");
if(!table) return;

table.innerHTML="";

events.forEach(e=>{
table.innerHTML+=`
<tr>
<td>${e.carName}</td>
<td>${e.eventType}</td>
<td>${new Date(e.timestamp).toLocaleString()}</td>
</tr>
`;
});
}

async function logEvent(car,event){
await fetch(EVENTS,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
carName:`${car.brand} ${car.model}`,
eventType:event,
timestamp:new Date().toISOString()
})
});
}

// ================= GRAFICA GLOBAL =================
function updateGlobalChart(cars){

const alertCount=cars.filter(c=>c.theftType && c.theftType!=="").length;
const normalCount=cars.length-alertCount;

if(globalChart) globalChart.destroy();

const canvas=document.getElementById("statusChart");
if(!canvas) return;

const ctx=canvas.getContext("2d");

globalChart=new Chart(ctx,{
type:"doughnut",
data:{
labels:["Normal","En Alerta"],
datasets:[{
data:[normalCount,alertCount],
backgroundColor:["#00ff88","#ff0000"],
borderWidth:2
}]
},
options:{
responsive:false,
cutout:"70%",
plugins:{
legend:{
position:"bottom",
labels:{color:"#ffffff"}
}
}
}
});
}

// ================= GRAFICAS INDIVIDUALES =================
function drawIndividualCharts(cars){

cars.forEach(car=>{

const canvas=document.getElementById(`chart-${car.id}`);
if(!canvas) return;

if(carCharts[car.id]){
carCharts[car.id].destroy();
}

const ctx=canvas.getContext("2d");
const hasIncident = car.theftType && car.theftType !== "";

carCharts[car.id]=new Chart(ctx,{
type:"doughnut",
data:{
datasets:[{
data:[1],
backgroundColor:[hasIncident ? "#ff0000" : "#00ff88"],
borderWidth:2
}]
},
options:{
responsive:false,
cutout:"70%",
plugins:{
legend:{display:false},
tooltip:{enabled:false}
}
},
plugins:[{
id:'centerText',
afterDraw(chart){
const {ctx,width,height}=chart;
ctx.save();
ctx.font="bold 16px Segoe UI";
ctx.fillStyle=hasIncident ? "#ff0000" : "#00ff88";
ctx.textAlign="center";
ctx.textBaseline="middle";
ctx.fillText(hasIncident?"ALERTA":"NORMAL",width/2,height/2);
}
}]
});

});
}