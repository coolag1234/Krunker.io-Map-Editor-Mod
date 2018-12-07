// ==UserScript==
// @name         Krunker.io Map Editor Mod
// @description  Krunker.io Map Editor Mod
// @updateURL    https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @downloadURL  https://github.com/Tehchy/Krunker.io-Map-Editor-Mod/raw/master/userscript.user.js
// @version      0.2
// @author       Tehchy
// @match        https://krunker.io/editor.html
// @require      https://raw.githubusercontent.com/Tehchy/Krunker.io-Map-Editor-Mod/master/prefabs.js
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

window.stop()
document.innerHTML = ""

class Mod {
    constructor() {
        this.hooks = {
            object: null,
            config: null,
            gui: null
        }
        this.copy = null
        this.onLoad()
    }

    objectSelected() {
        let selected = this.hooks.config.transformControl.object
        return selected ? selected : false
    }

    replaceObject(str) {
        let selected = this.objectSelected()
        if (!selected) {
            //this.hooks.config.addObject(this.hooks.object.defaultFromType("CUBE"))
            //selected = this.objectSelected()
        }
        if (selected) {
            this.hooks.config.removeObject()
            
            let jsp = JSON.parse(str);
            jsp = jsp.objects ? jsp.objects : jsp
            for (let ob of jsp) {
                ob.p[0] += selected.userData.owner.position.x
                ob.p[1] += selected.userData.owner.position.y
                ob.p[2] += selected.userData.owner.position.z
                this.hooks.config.addObject(this.hooks.object.deserialize(ob))
            }
        } else {
            alert("You must select a object first")
        }
    }
   
    
    copyObjects(cut = false) {
        let selected = this.objectSelected()
        var pos = {
            minX: selected.position.x - (selected.scale.x / 2), 
            minY: selected.position.y, 
            minZ: selected.position.z - (selected.scale.z / 2),  
            maxX: selected.position.x + (selected.scale.x / 2), 
            maxY: selected.position.y + selected.scale.y, 
            maxZ: selected.position.z + (selected.scale.z / 2), 
        }
        var intersect = []
        for (var i = 0; i < this.hooks.config.objInstances.length; i++) {
            if (this.hooks.config.objInstances[i].uuid == selected.uuid) continue
            var ob = this.hooks.config.objInstances[i].boundingMesh
            if (this.intersect({
                    minX: ob.position.x - (ob.scale.x / 2), 
                    minY: ob.position.y, 
                    minZ: ob.position.z - (ob.scale.z / 2), 
                    maxX: ob.position.x + (ob.scale.x / 2), 
                    maxY: ob.position.y + ob.scale.y, 
                    maxZ: ob.position.z + (ob.scale.z / 2)
                }, pos)) {
                intersect.push(this.hooks.config.objInstances[i].serialize())
                if (cut) this.hooks.config.removeObject(this.hooks.config.objInstances[i])
            }
        }
        this.copy = JSON.stringify(intersect)
    }
        
    intersect(a, b) {
        return (a.minX <= b.maxX && a.maxX >= b.minX) &&
            (a.minY <= b.maxY && a.maxY >= b.minY) &&
            (a.minZ <= b.maxZ && a.maxZ >= b.minZ);
    }

    addButtons() {
        document.getElementById("bottomBar").insertAdjacentHTML('beforeend', '<div class="bottomPanel"><div id="copyObjects" class="bottomButton">Copy Objects</div><div id="cutObjects" class="bottomButton">Cut Objects</div><div id="pasteObjects" class="bottomButton">Paste Objects</div><div id="saveObjects" class="bottomButton">Save Objects</div></div>');
        document.getElementById("copyObjects").addEventListener("click", t => {  
            let selected = this.objectSelected()
            if (!selected){
                return alert('Stretch a cube over your objects then click copy')
            }
            this.copyObjects()
        })
        
        document.getElementById("cutObjects").addEventListener("click", t => {  
            let selected = this.objectSelected()
            if (!selected){
                return alert('Stretch a cube over your objects then click cut')
            }
            this.copyObjects(true)
        })
        
        document.getElementById("pasteObjects").addEventListener("click", t => {  
            let selected = this.objectSelected()
            if (!selected){
                return alert('Select a object you would like to replace with your copied objects')
            }
            if (!this.copy) {
                return alert('Please copy objects first')
            }
            this.replaceObject(this.copy)
        })
        
        document.getElementById("saveObjects").addEventListener("click", t => {  
            if (!this.copy) {
                return alert('Please copy objects first')
            }
            var nme = prompt("Name your prefab", "");
            if (nme == null) {
                return alert('Please name your prefab')
            }
            this.download(this.copy, 'prefab_' + nme.replace(/ /g,"_") + '.txt', 'text/plain');
        })
        
        document.getElementById("deleteObject").insertAdjacentHTML('beforebegin', '<div id="replaceObject" class="bottomButton">Replace Object</div>');
        document.getElementById("replaceObject").addEventListener("click", t => {
            var json = prompt("Import Object Json", "");
            if (json != null && this.objectSelected()) {
                this.replaceObject(json)
            }
        })
    }

    setupMenu() {
        let n = this.hooks.gui.addFolder("Prefabs");
        let createObjects = {}
        let prefabs = localStorage.getItem('krunk_prefabs') ? JSON.parse(localStorage.getItem('krunk_prefabs')) : {}
        for (let ob in prefabs) {
            createObjects[ob] = (() => this.replaceObject(JSON.stringify(prefabs[ob])))
            n.add(createObjects, ob).name(ob)
        }
    }
    
    download(content, fileName, contentType) {
        //Credit to - https://stackoverflow.com/a/34156339
        var a = document.createElement("a");
        var file = new Blob([content], {type: contentType});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }

    onLoad() {
        this.addButtons()
    }
}

GM_xmlhttpRequest({
    method: "GET",
    url: "https://krunker.io/js/editor.js",
    onload: res => {
        let code = res.responseText
        code = code.replace(/String\.prototype\.escape=function\(\){(.*)\)},(Number\.)/, "$2")
            .replace('("Sky Color").listen().onChange', '("Sky Color").onChange')
            .replace('("Ambient Light").listen().onChange', '("Ambient Color").onChange')
            .replace('("Light Color").listen().onChange', '("Light Color").onChange')
            .replace('("Fog Color").listen().onChange', '("Fog Color").onChange')
            .replace(/(\w+).boundingNoncollidableBoxMaterial=new (.*)}\);const/, '$1.boundingNoncollidableBoxMaterial = new $2 });window.mod.hooks.object = $1;const')
            .replace(/(\w+).init\(document.getElementById\("container"\)\)/, '$1.init(document.getElementById("container")), window.mod.hooks.config = $1')
            .replace(/\[\],(\w+).open\(\),/, '[],$1.open(),window.mod.hooks.gui=$1,window.mod.setupMenu(),')

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://krunker.io/editor.html",
            onload: res => {
                let html = res.responseText
                html = html.replace(' src="js/editor.js">', `>${Mod.toString()}\nwindow.mod = new Mod();\n${code.toString()}`)
                document.open()
                document.write(html)
                document.close()
            }
        })
    }
})
