const app = new Vue({
  // create new Vue instance
  el: "#app",
  data: {
    // init the values
    url: "",
    slug: "",
    error: "",
    formVisible: true,
    created: null,
  },
  methods: {
    async createUrl() {
      // method to create url
      this.error = "";
      const response = await fetch("/url", {
        // fetch reponse from api
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: this.url,
          slug: this.slug,
        }),
      });
      if (response.ok) {
        // hide the form and show the tiny url
        const result = await response.json();
        this.formVisible = false;
        this.created = `http://ismverse.ml:7171/${result.slug}`;
      } 
      else if (response.status === 429) {
        // too many requests from the same ip
        this.error = "Hey, have a cooldown for 30s!";
      } 
      else {
        const result = await response.json();
        this.error = result.message;
      }
    },
  },
});