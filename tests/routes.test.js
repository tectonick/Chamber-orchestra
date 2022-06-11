const supertest = require('supertest')
const {CreateApp}=require("../server");
jest.mock("../logger");

let request;
  beforeAll(() => {
      console.log=jest.fn();
    request = supertest(CreateApp());
  })

test("GET /", async () => {
    const response = await request.get("/")
    expect(response.statusCode).toBe(200)
})
test("GET /events", async () => {
    const response = await request.get("/events")
    expect(response.statusCode).toBe(200)
})
test("GET /events/archive", async () => {
    const response = await request.get("/events/archive")
    expect(response.statusCode).toBe(200)
})
test("GET /about", async () => {
    const response = await request.get("/about")
    expect(response.statusCode).toBe(200)
})
test("GET /about/musicians", async () => {
    const response = await request.get("/about/musicians")
    expect(response.statusCode).toBe(200)
})
test("GET /media/disks", async () => {
    const response = await request.get("/media/disks")
    expect(response.statusCode).toBe(200)
})
test("GET 404", async () => {
    const response = await request.get("/testtesttest")
    expect(response.statusCode).toBe(404)
})
test("GET /admin Redirects", async () => {
    const response = await request.get("/admin")

    expect(response.statusCode).toBe(302)
})

test("GET /api/concerts returns json", async () => {
    await request.get("/api/concerts").expect('Content-Type', /json/).expect(200);
})

