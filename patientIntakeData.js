const patientIntakeForm = {
  painLocations: "" // Enum list TBD,
  painIntensity: null, // 0-10
  dateStarted: "",
  injurySource: "",
  description: "",
  symptoms: {
    painQuality: { // multi select
      sharp: false,
      dull: false,
      throbbing: false,
      stabbing: false,
      aching: false,
      heavy: false,
      burning: false,
      other: "",
    },
    otherSymptoms: { // multi select
      stiffness: false,
      instability: false,
      catching: false,
      popping: false,
      locking: false,
      other: "",
    },
    sensations: { // multi select
      bruising: false,
      swelling: false,
      numbness: false,
      tingling: false,
      weakness: false,
    },
    status: { // multi select
      worsening: false,
      resolved: false,
      improving: false,
      constant: false,
      occasional: false,
    },
    timing: {
      whenMostSevere: { // multi select
        morning: false,
        afternoon: false,
        evening: false,
        consistentAllDay: false,
        interruptsSleep: false,
        other: "",
      },
      whatMakesWorse: { // multiselect
        rest: false,
        activity: false,
        sleeping: false,
        kneeling: false,
        other: "",
      },
      whatMakesBetter: { // multi select
        rest: false,
        activity: false,
        ice: false,
        medication: false,
        brace: false,
        other: "",
      },
    },
  },
  treatments: {
    priorPhysician: {
      seen: null, // true/false
      provider: "",
      when: "",
    },
    priorSurgery: {
      had: null, // true/false
      surgery: "",
      when: "",
    },
    treatmentsTried: {
      massageTherapy: { tried: false, helpful: null },
      physicalTherapy: { tried: false, helpful: null },
      chiropracticTherapy: { tried: false, helpful: null },
      acupuncture: { tried: false, helpful: null },
      bracing: { tried: false, helpful: null },
      injections: { tried: false, helpful: null },
      medication: { tried: false, helpful: null },
      other: { tried: false, helpful: null, description: "" },
    },
    studiesCompleted: {
      xRays: false,
      mri: false,
      ctScan: false,
      emgNerveStudy: false,
      boneScan: false,
      ultrasound: false,
      other: "",
    },
  },
};
