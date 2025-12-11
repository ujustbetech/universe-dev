import React from 'react'

const Switch = ({ isOn, handleToggle }) => {
    return (
     <>
        <input
                checked={isOn}
                onChange={handleToggle}
                className="switch-checkbox"
                id={`switch-new`}
                type="checkbox"
            />
            <label
                className="switch-label"
                htmlFor={`switch-new`} >

                <abbr className={`switch-button`} />
            </label>

     </>
    )
}

export default Switch
