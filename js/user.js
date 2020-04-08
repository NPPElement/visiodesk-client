/**
* introduce USER as a global variable just to keep in memory current authorized user
*/
(function(){
	function UserFile(description, filePath) {
		let _description = description;
		let _filePath = filePath;
		
		let userFile = {
            getFilePath: function () {
                return _filePath;
            },
            getDescription: function () {
                return _description;
            }
        };
		
		userFile.__defineGetter__("description", function() { return _description; });
		userFile.__defineGetter__("filePath", function() { return _filePath; });
		
		return userFile;
	}
	
	//current authorized user
	function User() {
		let _token = "";
		let _userFiles = [];
		
		let user = {
            authorized: authorized,
        };
		
		user.__defineGetter__("token", function() { return _token; });
		user.__defineGetter__("userFiles", function() { return _userFiles; });
		
		return user;
		
		/**
		* when authorized user, get all necessary data from server too
		*/
		function authorized(data) {
			_userFiles = (data.userFiles || []).map(function(o) {
				return UserFile(o.description, o.filePath);
			});
			
			setToken(data.token);
		}
		
		/**
		* @param {string} token
		*/
		function setToken(token) {
			_token = token;
		}
	}
	
	//global variable of current authorized user
	window.USER = User();
})();