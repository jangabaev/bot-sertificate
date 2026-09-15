const api = require("./api.service");

async function startCertificateDelivery(examId) {
  return api.post(`/rash/sendmessage/${encodeURIComponent(examId)}`);
}

async function getCertificateDeliveryStatus(examId) {
  return api.get(`/rash/exam/${encodeURIComponent(examId)}/certificate-status`);
}

async function retryFailedCertificates(examId) {
  return api.post(`/rash/sendmessage/retry/${encodeURIComponent(examId)}`, {});
}

module.exports = {
  startCertificateDelivery,
  getCertificateDeliveryStatus,
  retryFailedCertificates,
};
