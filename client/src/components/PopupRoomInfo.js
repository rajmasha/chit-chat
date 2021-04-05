import React, { useEffect, useState } from 'react'
import { Popup } from 'semantic-ui-react'

const style = {
  borderRadius: 10,
  padding: '1em',
  boxShadow: "0px 10px 10px rgba(113, 113, 113, 0.1)",
  border: 0,
}

const PopupRoomInfo = ({ roomId, rooms }) => {

    const [members, setMembers] = useState([]);

    useEffect(() => {

        const m = rooms?.filter(room => room.id === roomId)[0]?.members;
        setMembers(m);
        
    }, [roomId, rooms]);

    return (
        <Popup
            trigger={<div className="chat_info">i</div>}
            style={style} >
        
            <p style={{ fontWeight: '600' }}>Users: <span style={{ color: "#1ecdc5" }}>{members?.length}</span></p>
            <p>{members?.join(", ")}</p>

        </Popup>
    );

}
  


export default PopupRoomInfo