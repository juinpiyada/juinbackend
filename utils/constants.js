const roleMap = {
  User: 'User',
  'IT User': 'IT User',
  'Infrastructure User': 'Infrastructure User',
  'Administrator User': 'Administrator User'
};

const validTypes = ['it', 'student', 'infrastructure'];

const validStatuses = [
  'open',
  'allocated',
  'work in progress',
  'submitted back to owner',
  'closed'
];

module.exports = { roleMap, validTypes, validStatuses };
