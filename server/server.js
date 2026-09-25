import {app} from './app.js';
app.listen(Number(process.env.PORT)||3001,'localhost',()=>console.log(`MaturaAI API ready on http://localhost:${process.env.PORT||3001}`));
