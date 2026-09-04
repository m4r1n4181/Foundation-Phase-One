// Intercept fetch globally to inject appropriate token based on URL
const originalFetch = window.fetch;

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.toString();
  } else if (input instanceof Request) {
    urlStr = input.url;
  }

  const isPatientRoute = 
    urlStr.includes('/questionnaires') || 
    urlStr.includes('/uploads') || 
    urlStr.includes('/patient-auth') ||
    urlStr.includes('/documents');

  let token = null;
  if (isPatientRoute) {
    token = sessionStorage.getItem('patient_token');
  } else {
    token = localStorage.getItem('staff_token');
  }

  if (token) {
    init = init || {};
    init.headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`
    };
    
    // If input is a Request, we need to clone it with new headers
    if (input instanceof Request) {
      input = new Request(input, {
        headers: init.headers
      });
    }
  }

  return originalFetch(input, init);
};

export {};
