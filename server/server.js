import {app} from './app.js';
app.listen(Number(process.env.PORT)||3001,'127.0.0.1',()=>console.log(`MaturaAI API ready on http://127.0.0.1:${process.env.PORT||3001}`));
