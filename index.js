import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

env.config();

const db = new pg.Client({
    user:process.env.DATABASE,
    host:process.env.HOST,
    database:process.env.DB_NAME,
    password:process.env.PASSWORD,
    port:process.env.PORT_NO
});

db.connect();

const port = 3000;

const app = express();
 
app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended:true}));

app.get("/",(req,res) => {
    res.render("index.ejs");
});

app.get("/patient-login",(req,res) => {
    res.render("patientlogin.ejs");
});

app.get("/patient-register",(req,res) => {
    res.render("patientregister.ejs");
});

app.post("/patient-register",async (req,res) => {
    try{
      await db.query("INSERT INTO patient(pname,dob,gender,bgrp,email,address,mobile,password) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[req.body.user,req.body.date,req.body.gen,req.body.bg,req.body.email,req.body.address,req.body.mobileno,req.body.pwd]);
      res.render("patientlogin.ejs");
    }catch(error){
        res.render("patientregister.ejs",{error:error.message});
     console.log(error.message);
    }
});

app.post("/submit",async (req,res) => {
const pname = req.body.uname;
const passwd = req.body.pwd;
console.log(req.body);
try{
 const result = await db.query("SELECT * FROM patient WHERE pname=$1",[pname]);
 const resultRows = result.rows;
 console.log(resultRows);
 if(resultRows.length == 0){
    res.render("patientlogin.ejs",{user:"User not found"});
 }else{
 if(pname == resultRows[0].pname){
    if(passwd == resultRows[0].password){
   
        res.render("patientdetails.ejs", {id : resultRows[0].id,
            names : pname,
        dob : resultRows[0].dob,
        gender : resultRows[0].gender,
        bgrp : resultRows[0].bgrp,
        email : resultRows[0].email,
        mobile : resultRows[0].mobile,
        address : resultRows[0].address
        });
    }
    else{
        res.render("patientlogin.ejs",{wrong:"Wrong Password"});
    }
}else{
    res.render("patientlogin.ejs",{user:"User not found"});
}
 }
}catch(error){
console.log(error.message);
}
});

app.get("/update/:id",async (req,res) => {
    const id = parseInt(req.params.id);
    console.log(id);
    try{
    const result = await db.query("SELECT email,mobile,address,pname FROM patient WHERE id=$1",[id]);
    const resultRows = result.rows[0];
    console.log(resultRows);
    res.render("patientdetailsupdate.ejs",{email:resultRows.email,mobile:resultRows.mobile,add:resultRows.address,id:id,names:resultRows.pname});
    }catch(error){
        console.log(error.message);
    }
});
app.post("/update/:id",async (req,res) => {
    const id = parseInt(req.params.id);
    try{
     await db.query("UPDATE patient SET email = $1, mobile = $2, address = $3 WHERE id=$4",[req.body.email,req.body.mobile,req.body.address,id]);
     res.redirect("/patient-login");
    }catch(error){
     console.log(error.message);
    }
});

app.get("/list-doctors/:id",async (req,res) => {
    const patientId = parseInt(req.params.id);
    console.log(patientId);
    try{
    const result = await db.query("SELECT * FROM listdoctors");
    const resultRows = result.rows;
    res.render("listdoctors.ejs",{doctors:resultRows,patientid : patientId});
    }catch(error){
        console.log(error.message);
    }
});

app.get("/book/:id",async (req,res) => {
    const patientId = parseInt(req.params.id);
    try{
        const result = await db.query("SELECT DISTINCT depart FROM listdoctors");
        const resultRows = result.rows;
        console.log(resultRows)
        res.render("book.ejs",{doctors:resultRows,patientid : patientId});
        }catch(error){
            console.log(error.message);
        }
});

app.post("/check/:id",async (req,res) => {
    const patientId = parseInt(req.params.id);
    console.log(req.body);
    const resultDoctor = await db.query("SELECT * FROM listdoctors WHERE depart=$1",[req.body.departnment]);
    console.log(resultDoctor.rows);
    var name =[];
    var doctor=[];
    var fee=[];
    var id=[];
    for(var i=0;i<resultDoctor.rows.length;i++){
        name.push(resultDoctor.rows[i].name);
        doctor.push(resultDoctor.rows[i].depart);
        fee.push(resultDoctor.rows[i].fee);
        id.push(resultDoctor.rows[i].id);
    }
    const total={
        doctors:doctor,
        names:name,
        fees:fee,
        ids:id,
        patientid:patientId
    }
    console.log(total);
    res.render("book2.ejs",total);
});
app.post("/book/:id",async (req,res) => {
    const patientId = parseInt(req.params.id);
 console.log(req.body);
 const resultTimings = await db.query("SELECT day,time,doctor_id FROM listdoctors JOIN timings ON listdoctors.id=timings.doctor_id WHERE listdoctors.id=$1;",[req.body.doctorid]);
 var days=[];
 var times=[];
 for(var i=0;i<resultTimings.rows.length;i++){
   days.push(resultTimings.rows[i].day);
   times.push(resultTimings.rows[i].time);
 }
 const total={day:days,time:times,patientid:patientId,doctorid:resultTimings.rows[0].doctor_id};
 res.render("book3.ejs",total);

});
app.post("/booking/:id",async (req,res)=>{
    const patientId = parseInt(req.params.id);
    console.log(req.body);
    await db.query("INSERT INTO book(patient_id,doctor_id,day,time) VALUES($1,$2,$3,$4)",[patientId,parseInt(req.body.doctorid),req.body.day,req.body.time]);
    const result = await db.query("SELECT * FROM book WHERE patient_id=$1",[patientId]);
    const name = await db.query("SELECT pname FROM patient WHERE id=$1",[patientId]);
    const recentBooking = result.rows.length-1;
    res.render("booked.ejs",{patientname:name.rows[0].pname,patientid:result.rows[recentBooking].patient_id,doctorid:result.rows[recentBooking].doctor_id,day:result.rows[recentBooking].day,time:result.rows[recentBooking].time});

});
app.listen(port,() => {
    console.log(`Server running on port ${port}`);
});