module.exports = function() {
    function StateMachine() {
        this.data = {};
    }

    /**
     * Returns the value associated with given key or null if state-machine doesn't contain such key
     * @param key
     */
    StateMachine.prototype.get = function(key) {
        if (this.data[key] == null) {
            return null;
        }
        return this.data[key];
    };

    /**
     * Associate a new value witn the given key 
     * @param key
     * @param value
     */
    StateMachine.prototype.set = function(key, value) {
        this.data[key] = value;
    };

    /**
     * Releases association with given key
     * @param key
     */
    StateMachine.prototype.del = function(key) {
        delete this.data[key];
    };

    /**
     * Applies given command (get, set, del) to the state-machine instance
     * @param command
     */
    StateMachine.prototype.apply = function(command) {
        /*if (command.key == null) {
            console.error("StateMachine.apply(command) - missing key property");
            return;
        }*/
        if (command.action == 'get') {
            return this.get(command.key);
        } else if (command.action == 'set') {
            if (command.value == null) {
                console.error("StateMachine.apply(command) - missing value property");
                return;
            }
            this.set(command.key, command.value);
        } else if (command.action == 'del') {
            this.del(command.key);
        } else {
            console.warn("StateMachine.apply(command) - unexpected command to apply", command);
        }
    };
    
    return new StateMachine();
};