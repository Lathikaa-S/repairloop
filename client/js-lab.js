// Real executable examples used by the learning page and unit tests.
export function eventLoopDemo() {
  return new Promise((resolve) => {
    const order = ["1. synchronous start"];
    setTimeout(() => {
      order.push("4. timer callback (task)");
      resolve(order);
    }, 0);
    Promise.resolve().then(() => order.push("3. Promise callback (microtask)"));
    order.push("2. synchronous end");
  });
}
export function hoistingDemo() {
  const result = describeRepair();
  function describeRepair() {
    return "Function declarations can be called before their declaration.";
  }
  let before;
  {
    before = typeof declaredWithVar;
    var declaredWithVar = "ready";
  }
  let tdz;
  try {
    tdz = notInitialized;
  } catch (error) {
    tdz = error.name;
  }
  let notInitialized = "ready";
  return [
    result,
    `var before assignment: ${before}`,
    `let before initialization: ${tdz}`,
    `let after initialization: ${notInitialized}`,
  ];
}
export function makeCounter() {
  let count = 0;
  return () => ++count;
}
export function callbackToPromise(register) {
  return new Promise((resolve, reject) =>
    register((error, result) => (error ? reject(error) : resolve(result))),
  );
}
