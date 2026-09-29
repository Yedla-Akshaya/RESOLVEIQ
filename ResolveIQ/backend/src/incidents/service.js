/**
 * ResolveIQ Incident Management Service
 */

const { incidentRepo } = require("./repository");

class IncidentService {
  createIncident(data) {
    return incidentRepo.createIncident(data);
  }

  getIncident(id) {
    return incidentRepo.getIncident(id);
  }

  listIncidents() {
    return incidentRepo.listIncidents();
  }

  updateIncident(id, updates) {
    return incidentRepo.updateIncident(id, updates);
  }

  addEvent(id, eventData) {
    return incidentRepo.addEvent(id, eventData);
  }
}

const incidentService = new IncidentService();

module.exports = {
  incidentService,
  IncidentService
};
