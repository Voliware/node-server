class App {
    constructor(){
        this.elements = {
            status: Template.select("#status")
        };
        this.getVersion();
        this.getStatus();
        return this;
    }

    getStatus(){
        let self = this;
        return fetch("/status")
            .then(function(response){
                return response.json();
            })
            .then(function(json){
                self.renderStatus(json.status);
            });
    }

    renderStatus(status){
        this.elements.status.render({status});
        return this;
    }

    getVersion(){
        let self = this;
        return fetch("/version")
            .then(function(response){
                return response.json();
            })
            .then(function(json){
                self.renderVersion(json.version);
            });
    }

    renderVersion(version){
        this.elements.status.render({version});
        return this;
    }
}

let app = new App();