import { configureStore } from '@reduxjs/toolkit';
import sidebarSlice from './sidebarSlice';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import doctorReducer from './doctorSlice';

const store = configureStore({
  reducer: {
    sidebarSlice: sidebarSlice,
    theme: themeReducer,
    auth: authReducer,
    doctor: doctorReducer,
  },
});


export default store;





