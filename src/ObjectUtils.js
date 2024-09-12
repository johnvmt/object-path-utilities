// Object Utils v1.0.16
const defaultOptions = {
    separator: "/",
    parent: "..",
    current: ".",
};

function objectFilterExclude(rawObject, pathsOrPathsParts = [], deepClone = true) {
    const clone = objectClone(rawObject, deepClone);
    for(let objectPath of pathsOrPathsParts) {
        objectDelete(clone, objectPath);
    }
    return clone;
}

function objectFilterInclude(rawObject, pathsOrPathsParts = [], options = {}) {
    const filteredObject = {};

    for(let pathOrPathParts of pathsOrPathsParts) {
        const pathParts = pathPartsFromPath(pathOrPathParts, options.separator);
        if(objectHas(rawObject, pathParts, options))
            objectSet(filteredObject, pathParts, objectGet(rawObject, pathParts, options), options);
    }

    return filteredObject;
}

function objectClone(rawObject, deep = true) {
    if(typeof value === "object" && value !== null) {
        if(deep)
            return structuredClone(rawObject);
        else
            return { ...rawObject };
    }
    else // scalar
        return rawObject;
}

function indexArrayBy(array, pathOrParts, options = {}) {
    const pathParts = pathPartsFromPath(pathOrParts, options.separator);
    return array.reduce((indexed, item) => {
        if ((item instanceof Object)) {
            const indexValue = objectGet(item, pathParts, options);
            if (indexValue !== undefined)
                indexed[indexValue] = item;
        }

        return indexed;
    }, {});
}

function objectDeepEqual(x, y) {
    if(x === y)
        return true;

    else if((typeof x === "object" && x !== null) && (typeof y === "object" && y !== null)) {
        if(Object.keys(x).length !== Object.keys(y).length)
            return false;

        for(let prop in x) {
            if(x.hasOwnProperty(prop) && y.hasOwnProperty(prop)) {
                if (!objectDeepEqual(x[prop], y[prop]))
                    return false;
            }
            else
                return false;
        }
        return true;
    }
    else
        return (x === y);
}

function objectDiffs(x, y) {
    const diffPaths = [];

    const objectDiffsX = (x, y, prefix = []) => {
        if(typeof x === "object" && x !== null) {
            for(let prop in x) {
                if(x.hasOwnProperty(prop)) {
                    if(typeof x[prop] === "object" && x[prop] !== null) // x[prop] is an object
                        objectDiffsX(x[prop], (typeof y === "object" && y !== null) ? y[prop] : undefined, prefix.concat([prop]));
                    else if (typeof y !== "object" || y === null || x[prop] !== y[prop]) // x[prop] is not an object and doesnt match y[prop]
                        diffPaths.push(prefix.concat([prop]))
                }
            }
        }
    }

    const objectDiffsY = (y, x, prefix = []) => {
        if(typeof y === "object" && x !== null) {
            for(let prop in y) {
                if(y.hasOwnProperty(prop)) {
                    if(typeof y[prop] === "object" && y[prop] !== null) // y[prop] is an object
                        objectDiffsY(y[prop], (typeof x === "object") ? x[prop] : undefined, prefix.concat([prop]));
                    else if (typeof x !== "object" || x[prop] === undefined) // y[prop] is not an object and doesnt match x[prop]
                        diffPaths.push(prefix.concat([prop]))
                }
            }
        }
    }

    objectDiffsX(x, y);
    objectDiffsY(y, x);

    return diffPaths;
}

// TODO add prune
function objectDelete(object, objectPath, options = {}) {
    const pathParts = pathPartsFromPath(objectPath, options.separator);

    if(pathParts.length === 0) { // delete root
        for(let property in object) {
            if(object.hasOwnProperty(property))
                delete object[property];
        }
    }
    else {
        const parentObjectPath = pathParts.slice(0, pathParts.length - 1);
        if(!objectHas(object, parentObjectPath, options))
            return undefined;

        delete objectGet(object, parentObjectPath, options)[pathParts[pathParts.length - 1]];
    }
}

function objectHas(object, objectPath, options = {}) {
    const pathParts = pathPartsFromPath(objectPath, options.separator);

    if(pathParts.length === 0)
        return true;
    else if(!(object instanceof Object) || !(pathParts[0] in object))
        return false;
    else
        return objectHas(object[pathParts[0]], pathParts.slice(1), options);
}

function objectGet(object, objectPath, options = {}) {
    const pathParts = pathPartsFromPath(objectPath, options.separator);

    if(pathParts.length === 0)
        return object;
    else if(!(object instanceof Object))
        return undefined;
    else
        return objectGet(object[pathParts[0]], pathParts.slice(1), options);
}

function objectSet(object, objectPath, value, options = {}) {
    const pathParts = pathPartsFromPath(objectPath, options.separator);

    if(pathParts.length === 0) // setting whole object, cannot set in place
        return value;
    else { // setting part of object
        const objectKey = pathParts[0];

        if(pathParts.length === 1)
            object[objectKey] = value;
        else {
            if(typeof object[objectKey] !== "object" || object[objectKey] === null) {
                const childObjectKey = pathParts[1];
                object[objectKey] = (options.array && (typeof childObjectKey === "number" || (typeof childObjectKey === "string" && /^\d+$/.test(childObjectKey))))
                    ? []
                    : {};
            }

            objectSet(object[objectKey], pathParts.slice(1), value, options);
        }
        return object;
    }
}

function objectSetImmutable(object, objectPath, value, options = {}) {
    const pathParts = pathPartsFromPath(objectPath, options.separator);

    if(pathParts.length === 0)
        return value;
    else { // setting part of object
        const objectKey = pathParts[0];
        if(typeof object !== "object" || object === null) { // create it
            const childObjectKey = pathParts[1];
            if((options.array && (typeof childObjectKey === "number" || (typeof childObjectKey === "string" && /^\d+$/.test(childObjectKey)))))
                object = [];
            else
                object = {};
        }

        if(Array.isArray(object)) {
            const arrayClone = [...object];
            if((options.array && (typeof objectKey === "number" || (typeof objectKey === "string" && /^\d+$/.test(objectKey)))))
                arrayClone[Number(objectKey)] = objectSetImmutable(object[objectKey], pathParts.slice(1), value, options);
            else
                arrayClone[objectKey] = objectSetImmutable(object[objectKey], pathParts.slice(1), value, options);

            return arrayClone;
        }
        else
            return {...object, ...{[objectKey]: objectSetImmutable(object[objectKey], pathParts.slice(1), value, options)}}
    }
}

function objectDeleteImmutable(object, objectPath, options = {}) {
    if(!objectHas(object, objectPath, options)) // nothing to remove
        return object;

    const pathParts = pathPartsFromPath(objectPath, options.separator);

    const parentObjectPath = pathParts.slice(0, -1);
    const removeProp = pathParts[pathParts.length - 1];
    const parentObject = objectGet(object, parentObjectPath, options);

    const parentObjectClone = {...parentObject};
    delete parentObjectClone[removeProp];
    return objectSetImmutable(object, parentObjectPath, parentObjectClone, options);
}

function flattenObjectProps(object, options = {}) {
    // internal handler
    function flattenObjectPropsInternal(object, flattened, prefixParts) {
        if(!object instanceof Object)
            return flattened;

        for(let prop in object) {
            if(object.hasOwnProperty(prop)) {
                flattened.push(pathFromPathParts(prefixParts.concat([prop]), options.separator));
                if(typeof object[prop] === "object" && object[prop] !== null)
                    flattenObjectProps(object[prop], flattened, prefixParts.concat([prop]), options);
            }
        }

        return flattened;
    }

    return flattenObjectPropsInternal(object, [], []);

}

function flattenObject(object, options = {}) {
    // internal handler
    function flattenObjectInternal(object, flattened, prefixPathParts) {
        if(!object instanceof Object)
            return flattened;

        for(let prop in object) {
            if(object.hasOwnProperty(prop)) {
                if(typeof object[prop] === "object" && object[prop] !== null)
                    flattenObjectInternal(object[prop], flattened, prefixPathParts.concat([prop]), options);
                else
                    flattened[pathFromPathParts(prefixPathParts.concat([prop]), options.separator)] = object[prop];
            }
        }

        return flattened;
    }

    return flattenObjectInternal(object, {}, []);
}

function * traverseObject(objectOrPrimitive, options = {}) {
    function * traverseObjectInternal(objectOrPrimitive, prefixPathParts) {
        const pathOrPathParts = options.pathParts
            ? prefixPathParts
            : pathFromPathParts(prefixPathParts, options.separator);

        const objectOrPrimitiveIsBranch = typeof objectOrPrimitive === "object" && objectOrPrimitive !== null;

        if(options.branchNodes || !objectOrPrimitiveIsBranch)
            yield [pathOrPathParts, objectOrPrimitive];

        if(objectOrPrimitiveIsBranch) { // object
            for(let [pathPart, childObjectOrPrimitive] of Object.entries(objectOrPrimitive)) {
                yield * traverseObjectInternal(childObjectOrPrimitive, [...prefixPathParts, pathPart]);
            }
        }
    }

    yield * traverseObjectInternal(objectOrPrimitive, []);
}

function sanitizePathParts(pathParts) {
    return pathParts.filter(pathPart => {
        return typeof pathPart !== "string" || pathPart.length
    });
}

function pathPartsFromPath(objectPathOrParts, separator = defaultOptions.separator) {
    const pathParts = Array.isArray(objectPathOrParts)
        ? objectPathOrParts
        : objectPathOrParts.split(separator);

    return sanitizePathParts(pathParts);
}

function pathFromPathParts(objectPathOrParts, separator = defaultOptions.separator) {
    return Array.isArray(objectPathOrParts)
        ? sanitizePathParts(objectPathOrParts).join(separator)
        : objectPathOrParts;
}



// START
function mergeOptions(options = {}) {
    return {
        ...defaultOptions,
        ...options
    };
}


function pathIsAbsolute(pathOrPathParts, separator){
    const pathParts = pathPartsFromPath(pathOrPathParts, separator);
    return pathParts.length > 0 && pathParts[0].length === 0; // first part of path is the separator (eg: /aa/bb/cc)
}

function normalizePathParts(pathOrPathParts, options) {
    const mergedOptions = mergeOptions(options);

    let pathParts = pathPartsFromPath(pathOrPathParts, mergedOptions.separator);

    const absolutePath = pathIsAbsolute(pathParts, mergedOptions.separator);

    pathParts = pathParts.filter(pathPart => {
        if(typeof pathPart === "number")
            return true;
        else if(typeof pathPart === "string")
            return pathPart.length > 0;
        else
            return false;
    });

    const includedPathParts = [];

    for(let pathPart of pathParts) {
        if(pathPart === mergedOptions.parent) {
            if(includedPathParts.length > 0)
                includedPathParts.pop();
            else
                throw new Error("Invalid path (above root)")
        }
        else if(pathPart !== mergedOptions.current)
            includedPathParts.push(pathPart);
    }

    return {
        pathParts: includedPathParts,
        absolute: absolutePath,
        options: mergedOptions
    }

}

function normalizePath(pathOrPathParts, options) {
    const {
        pathParts,
        absolute: absolutePath,
        options: mergedOptions
    } = normalizePathParts(pathOrPathParts, options);

    if(absolutePath)
        pathParts.unshift("");

    return pathParts.join(mergedOptions.separator);
}

function resolvePath(pathOrPathParts, basePathOrPathParts = [], options = {}) {
    const mergedOptions =  mergeOptions(options);
    const pathParts = pathPartsFromPath(pathOrPathParts, mergedOptions.separator);

    if(pathIsAbsolute(pathParts, mergedOptions.separator))
        return normalizePath(pathParts, mergedOptions);
    else {
        const basePathParts = pathPartsFromPath(basePathOrPathParts, mergedOptions.separator);
        return normalizePath([...basePathParts, ...pathParts], mergedOptions);
    }
}

function resolvePathParts(pathOrPathParts, basePathOrPathParts, options = {}) {
    const mergedOptions =  mergeOptions(options);
    const pathParts = pathPartsFromPath(pathOrPathParts, mergedOptions.separator);

    if(pathIsAbsolute(pathParts, mergedOptions.separator))
        return normalizePathParts(pathParts, mergedOptions).pathParts;
    else {
        const basePathParts = pathPartsFromPath(basePathOrPathParts, mergedOptions.separator);
        return normalizePathParts([...basePathParts, ...pathParts], mergedOptions).pathParts;
    }
}

export {
    objectFilterExclude,
    objectFilterInclude,
    objectClone,
    objectDiffs,
    indexArrayBy,
    objectDeepEqual,
    objectDelete,
    objectHas,
    objectGet,
    objectSet,
    objectSetImmutable,
    objectDeleteImmutable,
    traverseObject,
    flattenObject,
    flattenObjectProps,
    pathPartsFromPath,
    pathFromPathParts,
    mergeOptions,
    pathIsAbsolute,
    normalizePathParts,
    normalizePath,
    resolvePath,
    resolvePathParts
}

export default {
    objectFilterExclude,
    objectFilterInclude,
    objectClone,
    objectDiffs,
    indexArrayBy,
    objectDeepEqual,
    objectDelete,
    objectHas,
    objectGet,
    objectSet,
    objectSetImmutable,
    objectDeleteImmutable,
    traverseObject,
    flattenObject,
    flattenObjectProps,
    pathPartsFromPath,
    pathFromPathParts,
    mergeOptions,
    pathIsAbsolute,
    normalizePathParts,
    normalizePath,
    resolvePath,
    resolvePathParts
}
