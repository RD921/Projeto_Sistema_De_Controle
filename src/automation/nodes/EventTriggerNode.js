module.exports = async (node, context) => {
  return { output: context.trigger.data || {} };
};
