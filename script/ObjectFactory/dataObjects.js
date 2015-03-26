//No separate namespace has been  created for the Object Factory class as the NETWORK OBJECT should itself have an Object Factory that generates and/or updates the DataObjects.
//The parsing rules used to create the objects are defined in the parserRules.js FILE.
(function(){
	NETWORK.ObjectFactory = function () {
		var dataObjects = this.dataObjects(this.infoForObjectGeneration());
		this.addTopDecoratorDataToBus(dataObjects);
		this.addBottomDecoratorDataToBus(dataObjects);
		this.addGeneratorCostData(dataObjects);
		this.updateEdgesData(dataObjects);
		this.updateBusStatus(dataObjects);
				
		this.getNetworkDataObjects = function() {
			return dataObjects;
		};
	};

	/**
	* Creates the master array of objects used for further calculation and network analysis.
	* @param	JSONString		The JSON string that is generated by parsing the input file based on specified set of rules.
	* @return 	The master object containing all the relevant Network object.**/
	NETWORK.ObjectFactory.prototype.dataObjects = function(JSONString) {
		var infoObject = JSON.parse(JSONString);
		var networkConfig = [];
		for(item in infoObject)
		{
			switch(infoObject[item].name)
			{
				case 'AreaData':
					var areaDataObj = this.generateDataObject(infoObject[item]);
					networkConfig["areaData"] = areaDataObj;
				break;	
				case 'BusData':
					var busDataObj = this.generateDataObject(infoObject[item]);
					networkConfig["busDataObj"] = busDataObj;
				break;
				case 'GeneratorData':
					var generatorDataObj = this.generateDataObject(infoObject[item]);
					networkConfig["generatorDataObj"] = generatorDataObj;
				break;
				case 'GeneratorCostData':
					var generatorCostData= this.generateDataObject(infoObject[item]);
					networkConfig["generatorCostDataObj"] = generatorCostData;
				break;
				case 'BranchData':
					var branchDataObj = this.generateDataObject(infoObject[item]);
					networkConfig["branchDataObj"] = branchDataObj;
				break;
				case 'BusLocation':
					var busLocation = this.generateDataObject(infoObject[item]);
					networkConfig["busLocation"] = busLocation;
				break;
				case 'BaseMVA':
					//ADD support for global data objects.
					networkConfig["BaseMVA"] = this.beautifyValue((this.getObjectContent(infoObject[item])).toString().split("=")[1]);
				break;
				default:
				break;
			}
		}
		return networkConfig;	
	};
		
	/**
		*	Gets the information regarding the generation of the objects i.e. the starting and the ending character of the object data in the passed text.
		*	@param	No direct param but it makes use of the global FILE object.
		*	@return		A json string containing all the information regarding the object creation (i.e. its name, beginning character and ending character).**/
	NETWORK.ObjectFactory.prototype.infoForObjectGeneration = function() {
		var _lclObjBeginIdentifiers = NETWORK.RULES.parser.ObjectIdentifiers.BeginningData;
		var _lclObjEndIdentifiers = NETWORK.RULES.parser.ObjectIdentifiers.EndingData;
		var allObjectInfo = [];
		
		for(key in _lclObjBeginIdentifiers) {
				var name = key;
				var searchParamsArray = _lclObjBeginIdentifiers[key];
				var beginLine, lineGap;
				//Check for all the rules for an object - one at a time.
				for(var i = 0; i < searchParamsArray.length ; i++) {
					if(FILE.search(searchParamsArray[i].toString()) !== -1) {
						
						//Based on the line on which the data is found we make use of the line gap.
						if(i === 1) {
							lineGap = 2;
						}
						else {
							lineGap = 1;
						}
						beginLine = FILE.search(searchParamsArray[i]);
						var endLine = FILE.indexOf(_lclObjEndIdentifiers[key],beginLine);
						var objInfo = { "name" : name, "beginChar": beginLine, "endChar": endLine,"lineGap":lineGap }
						allObjectInfo.push(objInfo);
						
						//break the loop as soon the data for an object is found
						break;
				}
			}
		}
		
		//JSON has been kept as the return type for modularity.
		return JSON.stringify(allObjectInfo);
	};
		
	/** 
	* Generated the useful Data Objects for the Network.
	* @param	rawDataObj		The raw data object which is created by parsing the text file based on the specific set of rules.
	* @return		The actual (useful) data object for the network simulation.
	**/
	NETWORK.ObjectFactory.prototype.generateDataObject = function(rawDataObj){
		var dataObjectWrapper = {};
		var dataObjList = [];
		dataObjectWrapper.dataObjList = dataObjList;
		var content = this.getObjectContent(rawDataObj);
		var contentIndex, valStartIndex, objProperties ;
		
		//Special handling for the cost object....find a way to integrate this with other objects....19/01/2015.
		if(rawDataObj.name === "GeneratorCostData") {
			contentIndex = 2;
			valStartIndex = 4;
			if(content[2].toString().replace(/(\r\n|\n|\r)/gm,"") === "mpc.gencost = [") {
				valStartIndex = 3;
			}
			objProperties = ["%", "GenID", "startup", "shutdown", "n", "cost1", "cost2", "cost3"];
		}
		else {
			contentIndex = 1;
			valStartIndex = 3;
			//The regular expression has been added because the new line character at the end of the line was
			//forcing JS  to make the last property name a string and hence inaccessible from the object.
			
			console.log(content);
			//The second replace statement has been added to convert all the spaces to tabs and the trim has been added to take care of all the leading and trailing spaces.
			objProperties = (((content[rawDataObj.lineGap].replace(/(\r\n|\n|\r)/gm,"")).trim()).replace(/\s{2,}/g, '\t')).split('\t');
		}
		
		//content.length-1 has been taken because the index starts from 0 whereas the length is calculated from 1.
		for(var valIndexer = valStartIndex; valIndexer < (content.length-1); valIndexer++)
		{
			var crtContent = content[valIndexer];
			//Updated the code to replace all the spaces by tab and then do the parsing.
			crtContent = $.trim(crtContent);
			if(crtContent !== "") {
				
				if(crtContent.indexOf(' ') !== -1)	{
					crtContent = crtContent.replace(/\s{1,}/g, '\t');
				}
				var eachObjectData = crtContent.split('\t');
				
				var actualDataObj = {};
				
				console.log(eachObjectData);
				console.log(objProperties);
				
				for(var propIndexer = 1; propIndexer < objProperties.length; propIndexer++)
				{
					actualDataObj[objProperties[propIndexer]] = this.beautifyValue((eachObjectData[propIndexer-1]).toString());
				}
				dataObjectWrapper.dataObjList.push(actualDataObj);
			}		
		}
		return dataObjectWrapper;
	};
	
	/**
	* Gets the relevant string array for a raw Data Object passed.
	* @param	rawDataObj		The data object that contains the required information for creating a Useful Data Object.
	* @return	The array of strings containing the relevant information regarding the specific network object.
	**/
	NETWORK.ObjectFactory.prototype.getObjectContent = function(rawDataObj) {
		return(FILE.substring(rawDataObj.beginChar,(rawDataObj.endChar + 2)).split('\n'));
	};
	
	/**
	*	Adds the list of the generators and their information to the specific bus - This is used for the generation of the top-decorators.
	*	param - The Network data object containing all the data objects used to populate the graph.
	*
	**/
	NETWORK.ObjectFactory.prototype.addTopDecoratorDataToBus = function(networkObjects) {
		for(var i = 0; i < networkObjects.busDataObj.dataObjList.length; i++) {
			var busObj = networkObjects.busDataObj.dataObjList[i];
			//As of now only the ID is added to the generator data object - the data added needs to updated. - 16/12/2014.
			var topDecorators = [], topDecoratorsID="";
			for(var j = 0; j < networkObjects.generatorDataObj.dataObjList.length; j++) {
				var genObj = networkObjects.generatorDataObj.dataObjList[j];
				if(genObj.bus === busObj.bus_i) {
					//As the values are dynamically assigned thus declaring the object outside the for loop will cause a reference error and only the value of the last object will be stored.
					var actualDataObj = {};
					var id = (j+1);
					actualDataObj["id"] = id;
					genObj["Pd"] = busObj.Pd;
					genObj["Qd"] = busObj.Qd;
					genObj["id"] = id;
					topDecoratorsID = topDecoratorsID + id +",";
					if(parseInt(genObj.Pmax) === 0 && parseInt(genObj.Pmin) === 0)  {
						actualDataObj["type"] = "synCondensor";
						actualDataObj["text"] = "c";
					}
					else {
						actualDataObj["type"] = "generator";
						actualDataObj["text"] = "~";
					}
					//Adding the DOMID to the top decorators. - This is the id of the top decorator group.
					genObj["DOMID"] = ("bus" + busObj.bus_i + "topDeco");
					//Also the same DOMID is added to the decorator group element so as to avoid any error. (in future code implementation).
					topDecorators["DOMID"] = ("bus" + busObj.bus_i + "topDeco");
					
					actualDataObj["topDecoData"] = genObj;
					
					topDecorators.push(actualDataObj);
				}
			}
			busObj["topDecorators"] = topDecorators;
			busObj["GenIdList"] = topDecoratorsID.slice(0,-1);
		}
	};

	/**
	*	Adds generator cost data to the Generator Objects.
	*	Acts as a post processing function over the data objects that are formed.
	*
	**/
	NETWORK.ObjectFactory.prototype.addGeneratorCostData = function(dataObjects) {
		//Loop Across the Generator Cost Object to update the Generator Data object with the relevant cost info.	
		for(var index = 0; index < dataObjects.generatorDataObj.dataObjList.length; index++) {
			(dataObjects.generatorDataObj.dataObjList[index])["costData"] = (dataObjects.generatorCostDataObj.dataObjList[index]);
		}
	};

	/**
	*	Adds the list of the load and the shunt and their information to the specific bus - This is used for the generation of the bottom-decorators.
	*	@param - networkObjects - The Network data object containing all the data objects used to populate the graph.
	**/
	NETWORK.ObjectFactory.prototype.addBottomDecoratorDataToBus = function(networkObjects) {
		for(var i = 0; i < networkObjects.busDataObj.dataObjList.length; i++) {
			var busObj = networkObjects.busDataObj.dataObjList[i];
			var bottomDecorators = [];
			
			if((parseFloat(busObj.Pd) !== 0.0) || (parseFloat(busObj.Qd) !== 0.0)) {
				////busType = load;
				var lObj = {};
				lObj["type"] = "load";
				lObj["Pd"] = busObj.Pd;
				lObj["Qd"] = busObj.Qd;
				lObj["Gs"] = busObj.Gs;
				lObj["Bs"] = busObj.Bs;
				//Adding the DOMID to the bottom decorator - this refers to the ID of the bottom group element.
				lObj["DOMID"] = ("bus" + busObj.bus_i + "bottomDeco");
				bottomDecorators.push(lObj);
			}
			
			if((parseFloat(busObj.Gs) !== 0.0) || (parseFloat(busObj.Bs) !== 0.0)) {
				//busType = "shunt";
				var sObj = {};
				sObj["type"] = "shunt";
				sObj["Pd"] = busObj.Pd;
				sObj["Qd"] = busObj.Qd;
				sObj["Gs"] = busObj.Gs;
				sObj["Bs"] = busObj.Bs;
				//Adding the DOMID to the bottom decorator - this refers to the ID of the bottom group element.
				sObj["DOMID"] = ("bus" + busObj.bus_i + "bottomDeco");
				bottomDecorators.push(sObj);
			}	
			//Adding the DOMID to the bottom decorator group
			bottomDecorators["DOMID"] = ("bus" + busObj.bus_i + "bottomDeco");
			busObj["bottomDecorators"] = bottomDecorators;
		}
	};

	/**
	*	Updated the branch data object with the attributes like - Source/Target Node Data, Name, Type, isMultiLine Status etc.
	*	Also adds the Node Edge Map to the NETWORK - This information once generated is independent of the Data Objects thus not attached in the Data Objects.
	*/
	NETWORK.ObjectFactory.prototype.updateEdgesData = function(networkConfigObj) {
		var edges = {}, nodeIndexMap = {}, nodeObjectMap = {};
		var edgeMapForMultiLine = [];
		for(nodeIndexer = 0; nodeIndexer < networkConfigObj.busDataObj.dataObjList.length; nodeIndexer++) {
			nodeIndexMap[networkConfigObj.busDataObj.dataObjList[nodeIndexer].bus_i] = nodeIndexer;
		}
	//Adding Node Branch Map to the NETWORK - This has been added to NETWORK because once created it is independent of the Data Object
		NETWORK["nodeEdgeMap"] = nodeIndexMap;
		
		for (branchIndexer = 0 ; branchIndexer < networkConfigObj.branchDataObj.dataObjList.length; branchIndexer++) {
			var edgeDataObj = networkConfigObj.branchDataObj.dataObjList[branchIndexer];			
			
			var edgeType = "Standard";
			if(parseFloat(edgeDataObj.ratio) !== 0.0 || parseFloat(edgeDataObj.angle) !== 0.0) {
				edgeType = "Transformer";
			}
			else if(parseFloat(edgeDataObj.b) !== 0.0){
				edgeType = "LineCharge";
			}
			
			var edgeRepCount = 1, isMultiLine = false;
			var edgeName = edgeDataObj.fbus + "-" + edgeDataObj.tbus + "-" + edgeDataObj.tbus + "-" + edgeDataObj.fbus + "-" + edgeRepCount;
			
			//Checking if the name of the edge has already been added to the array.
			if($.inArray(edgeName,edgeMapForMultiLine) !== -1) {
				isMultiLine = true;
				//Setting Multi line true for all previous repetitive edges.
				Object.keys(edges).forEach(function(key, index) {
					if(key.slice(0, - 2) === edgeName.slice(0, - 2)) {
						this[key].isMultiLine = isMultiLine;
						edgeRepCount++;
					}
				}, edges);
				edgeName = edgeName.slice(0, - 2);	
				edgeName = edgeName + "-" + edgeRepCount;
			}
			edgeMapForMultiLine.push(edgeName);
		

			/**Region - Add Thermal Rating to the edge**/
				//Angle to be used to find the Cosine.
				var delta= Math.max(parseFloat(edgeDataObj.angmin),parseFloat(edgeDataObj.angmax));
				var cosDel;
				if(delta > 90) {
					cosDel = 0;
				}
				else {
					cosDel = Math.cos(delta * (Math.PI / 180));
				}
				
				var sourceBus = networkConfigObj.busDataObj.dataObjList[nodeIndexMap[edgeDataObj.fbus]];
				var targetBus =  networkConfigObj.busDataObj.dataObjList[nodeIndexMap[edgeDataObj.tbus]];
				
				var srcVmSq = Math.pow(parseFloat(sourceBus.Vmax),2);
				var trgVmSq = Math.pow(parseFloat(targetBus.Vmax),2);
				var ySquared = (1/((Math.pow(parseFloat(edgeDataObj.r),2)) + (Math.pow(parseFloat(edgeDataObj.x),2))));
				var equSecPart = (srcVmSq + trgVmSq - (2 * sourceBus.Vmax * targetBus.Vmax * cosDel));
				var V1 = Math.abs(srcVmSq * equSecPart * ySquared);
				var V2 = Math.abs(trgVmSq * equSecPart * ySquared);
				var UB = Math.sqrt(Math.max(V1,V2)) * parseFloat(networkConfigObj.BaseMVA);
				edgeDataObj["UB"]  = UB;
			/**Region Ends**/	
			
			var edge = {	
								"index":branchIndexer+1,
								"edgeId" : ("From Bus '" + edgeDataObj.fbus + "' to Bus '" + edgeDataObj.tbus +"'"),
								 "source": nodeIndexMap[edgeDataObj.fbus],
								 "target": nodeIndexMap[edgeDataObj.tbus],
								 "edgeData" : edgeDataObj,
								 "edgeType" : edgeType,
								 "edgeName": edgeName,
								 "isMultiLine" : isMultiLine,
							};
			edges[edgeName] = edge;
		}
		
		var edgeData = [];		
		Object.keys(edges).forEach(function(key, index) {
			edgeData.push(this[key]);
		}, edges);
		
		networkConfigObj.branchDataObj.dataObjList = edgeData;
	};

	/**Adds the bus status to each Bus object in the dataObject created
	* Rule used for adding the bus status is - If the bus type is 4 then the status of the bus is 0 i.e. off.
	**/
	NETWORK.ObjectFactory.prototype.updateBusStatus = function(networkConfigObj) {
		for(nodeIndexer = 0; nodeIndexer < networkConfigObj.busDataObj.dataObjList.length; nodeIndexer++) {
			var status = 1;
			if(networkConfigObj.busDataObj.dataObjList[nodeIndexer].type === "4") {
				status = 0;
			}
			networkConfigObj.busDataObj.dataObjList[nodeIndexer]["status"] = status;
		}
	};
	
	/**
	*	Updates the string value by removing the unwanted characters.
	*	@param	strVal	The string value that needs to be updated.
	*	@return		The updated string value (i.e. removes the unwanted carriage character, semi-colon and additional spaces.
	**/
	NETWORK.ObjectFactory.prototype.beautifyValue = function(strVal) {
		var updatedStrVal = strVal.replace(';\r','');
		updatedStrVal = updatedStrVal.replace('\r','');
		updatedStrVal = updatedStrVal.trim();
		//This check has been added as some cases have comments after the last value - for example inputFiles/pub/nesta_case14_ieee.m (generator data case).
		if(updatedStrVal.indexOf(";") !== -1) {
			updatedStrVal = updatedStrVal.substr(0,updatedStrVal.indexOf(";"));
		}
		//updateStrVal = parseFloat(updateStrVal);
		return updatedStrVal;
	};	
})(NETWORK || (NETWORK = {}));