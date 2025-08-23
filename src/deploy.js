const bunnyURLBase = "https://api.bunny.net";
const endpoints = {
  code: (id) => `${bunnyURLBase}/compute/script/${id}/code`,
  variables: (id) => `${bunnyURLBase}/compute/script/${id}/variables`,
  secrets: (id) => `${bunnyURLBase}/compute/script/${id}/secrets`,
};
const options = (method, body = undefined) => ({
  method,
  body,
  headers: {
    accept: "application/json",
    "content-type": "application/json",
  },
});

async function deployCode(opts) {
  const { id, secrets, variables } = opts;
  const url = endpoints.code(id);
  fetch(url, options("POST"))
    .then((res) => res.json())
    .then((json) => console.log(json))
    .catch((err) => console.error(err));

  if (secrets) {
    const url = endpoints.secrets(id);
    Object.entries(secrets).forEach(([name, secret]) => {
      const opts = options("PUT", { name, secret });
      fetch(url, opts)
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((err) => console.error(err));
    });
  }

  if (variables) {
    const url = endpoints.variables(id);
    Object.entries(secrets).forEach(([name, defaultValue]) => {
      const opts = options("PUT", { name, defaultValue });
      fetch(url, opts)
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((err) => console.error(err));
    });
  }
}

async function deployAssets(opts) {}
