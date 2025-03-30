Module.register("MMM-AuroraForecast", {

  defaults: {
    updateInterval: 0.5	
  },

  /**
   * Apply the default styles.
   */
  getStyles() {
    return ["MMM-AuroraForecast.css"]
  },

  /**
   * Pseudo-constructor for our module. Initialize stuff here.
   */
  start() {
    this.updateInterval = this.config.updateInterval*60*1000;
	this.latitude = this.config.latitude;
	this.longitude = this.config.longitude;

	if (!this.config.socketListenerOnly) {

		//start data poll
		var self = this;
		setTimeout(function() {

			//first data pull is delayed by config
			self.getData();

			setInterval(function() {
				self.getData();
			}, self.config.updateInterval);

		}, this.config.requestDelay);		
	}
  },

  /**
   * Handle notifications received by the node helper.
   * So we can communicate between the node helper and the module.
   *
   * @param {string} notification - The notification identifier.
   * @param {any} payload - The payload data`returned by the node helper.
   */
  socketNotificationReceived: function (notification, payload) {
    if (notification === "EXAMPLE_NOTIFICATION") {
      this.templateContent = `${this.config.exampleContent} ${payload.text}`
      this.updateDom()
    }
  },

  /**
   * Render the page we're on.
   */
  getDom() {
    const wrapper = document.createElement("div")
    wrapper.innerHTML = `<b>Title</b><br />${this.templateContent}`

    return wrapper
  },

  addRandomText() {
    this.sendSocketNotification("GET_RANDOM_TEXT", { amountCharacters: 15 })
  },

  /**
   * This is the place to receive notifications from other modules or the system.
   *
   * @param {string} notification The notification ID, it is preferred that it prefixes your module name
   * @param {number} payload the payload type.
   */
  notificationReceived(notification, payload) {
    if (notification === "TEMPLATE_RANDOM_TEXT") {
      this.templateContent = `${this.config.exampleContent} ${payload}`
      this.updateDom()
    }
  }
})