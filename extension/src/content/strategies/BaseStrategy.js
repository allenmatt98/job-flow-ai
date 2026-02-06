export class BaseStrategy {
    constructor(name) {
        this.name = name;
    }

    matches(hostname) {
        return false;
    }

    scan() {
        throw new Error('scan() must be implemented');
    }

    autofill(profile) {
        throw new Error('autofill() must be implemented');
    }

    getPageText() {
        return document.body.innerText;
    }
}
