(async () => {
  try {
    const res = await fetch('http://localhost:4000/api/courses/public');
    console.log('status', res.status);
    const text = await res.text();
    console.log('body', text);
  } catch (err) {
    console.error('fetch error', err);
  }
})();