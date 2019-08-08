class App {
    constructor(){
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

        return this;
    }
}

let app = new App();