// Artillery processor for custom logic

module.exports = {
  // Generate random listing ID
  randomListingId: function(context, events, done) {
    const listingIds = [
      '5c3404e6-816c-4b13-a293-337b4a9d2656',
      '5bfb3db6-6678-40d9-afca-d28dd12e5a67',
      // Add more real listing IDs here
    ];
    context.vars.listingId = listingIds[Math.floor(Math.random() * listingIds.length)];
    return done();
  },

  // Log response time
  logResponseTime: function(requestParams, response, context, ee, next) {
    if (response.timings) {
      console.log(`Response time: ${response.timings.phases.total}ms`);
    }
    return next();
  }
};
