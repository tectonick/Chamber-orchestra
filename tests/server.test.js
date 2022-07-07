
const {CreateApp,StartServer}=require("../server");
const dbsource=require("../db");
jest.mock("../services/logger");
jest.useFakeTimers();

describe("Server starting", () => {
    let server;
    let app;
    beforeAll(async () => {
        app=CreateApp();
        server= StartServer(app);
    }
    );

    test("HTTP server started", async () => {   
        console.log = jest.fn();
        console.error=jest.fn();
        expect(server.httpServer).toBeTruthy();
        expect(server.httpsServer).toBeTruthy();
    })
    afterAll(() => { 
        dbsource.db().end();
        server.httpServer.close();
        server.httpsServer.close();
      })
});
