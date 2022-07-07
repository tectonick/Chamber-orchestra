const {db}=require("../db");
jest.mock("../services/logger");

test("DB connection successful", async () => {
    expect(db()).toBeTruthy();
    }
);

test("DB has correct schema", async () => {
    let rows = await db().promise().query("SHOW TABLES");
    expect(Object.values(rows[0][0])[0]).toBe("artists");
})

test("DB has STAT", async () => {
    let rows = await db().promise().query("CALL STAT()");
    expect(rows).toBeTruthy();
})

afterAll(() => {
    db().end();
}
);