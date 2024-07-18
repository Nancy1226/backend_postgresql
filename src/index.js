// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import router from './routes/router.js';

dotenv.config();

const app = express();
app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:5173', // Reemplaza con el origen de tu frontend
  credentials: true, // Permitir credenciales
};

app.use(cors(corsOptions));
app.use(cookieParser());

app.use('/api', router);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
