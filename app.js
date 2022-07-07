const {StartServer, CreateApp}=require("./server");

const app=CreateApp();
StartServer(app);